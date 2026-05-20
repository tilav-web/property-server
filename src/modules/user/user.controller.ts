import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { type Response } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from './dto/update-user.dto';
import { Throttle } from '@nestjs/throttler';
import type { SmsLanguage } from '../sms/sms.service';
import {
  AccessTokenResponseDto,
  AuthResponseDto,
  ChangePasswordDto,
  ConfirmOtpDto,
  ForgotPasswordDto,
  LoginDto,
  MessageResponseDto,
  RefreshTokenDto,
  ResendOtpDto,
  ResetPasswordDto,
  TokenPairResponseDto,
  WebAuthResponseDto,
} from './dto/auth.dto';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { MobileOAuthService } from './services/mobile-oauth.service';
import {
  AppleMobileLoginDto,
  GoogleMobileLoginDto,
} from './dto/mobile-oauth.dto';

type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

function isMobileClient(req: IRequestCustom): boolean {
  const clientType = req.headers['x-client-type'];
  const platform = req.headers['x-platform'];
  const normalize = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0]?.toLowerCase() : value?.toLowerCase();

  return (
    normalize(clientType) === 'mobile' ||
    ['ios', 'android', 'mobile'].includes(normalize(platform) ?? '')
  );
}

function attachRefreshCookie(res: Response, refreshToken: string): Response {
  return res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function sendAuthResponse({
  req,
  res,
  user,
  tokens,
}: {
  req: IRequestCustom;
  res: Response;
  user: unknown;
  tokens: AuthTokens;
}) {
  const body = isMobileClient(req)
    ? {
        user,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }
    : { user, access_token: tokens.access_token };

  return attachRefreshCookie(res, tokens.refresh_token).json(body);
}

// Accept-Language header'idan SMS tilini aniqlash. Noma'lum til → en fallback.
function detectSmsLanguage(req: {
  headers: Record<string, unknown>;
}): SmsLanguage {
  const raw = (req.headers['accept-language'] as string | undefined) ?? '';
  const first = raw.split(',')[0]?.trim().toLowerCase();
  if (first === 'uz' || first === 'ru' || first === 'en' || first === 'ms') {
    return first;
  }
  return 'en';
}

@ApiTags('User Auth')
@ApiExtraModels(
  AccessTokenResponseDto,
  AuthResponseDto,
  TokenPairResponseDto,
  WebAuthResponseDto,
)
@Controller('users/auth')
export class UserController {
  constructor(
    private readonly service: UserService,
    private readonly mobileOAuth: MobileOAuthService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: IRequestCustom) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: IRequestCustom, @Res() res: Response) {
    const { access_token, refresh_token } = await this.service.socialLogin(req);
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.redirect(`${process.env.CLIENT_URL}/auth/social`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth(@Req() req) {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req, @Res() res: Response) {
    const { access_token, refresh_token } = await this.service.socialLogin(req);
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.redirect(`${process.env.CLIENT_URL}/auth/social`);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleAuth(@Req() req) {}

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthRedirect(@Req() req, @Res() res: Response) {
    const { access_token, refresh_token } = await this.service.socialLogin(req);
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.redirect(`${process.env.CLIENT_URL}/auth/social`);
  }

  // ==========================================================================
  // MOBILE NATIVE OAUTH - body'da idToken bilan, cookie ishlatilmaydi
  // ==========================================================================

  @Throttle({ default: { limit: 5, ttl: 10000 } })
  @Post('/google/mobile')
  @ApiOperation({
    summary: 'Google Sign-In (mobile native SDK)',
    description:
      "Mobile ilovadan native Google Sign-In SDK orqali olingan idToken'ni verify qilib, " +
      "access_token va refresh_token qaytaradi. Cookie ishlatilmaydi - ikkala token body'da. " +
      "Token Google'ning JWKS bilan verify qilinadi (aud GOOGLE_CLIENT_ID yoki GOOGLE_MOBILE_CLIENT_IDS bo'lishi kerak).",
  })
  @ApiBody({ type: GoogleMobileLoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiStandardErrors({
    validation: true,
    auth: true,
    throttle: true,
    messages: {
      unauthorized: "Google token noto'g'ri yoki muddati o'tgan",
    },
  })
  async googleMobile(@Body() dto: GoogleMobileLoginDto) {
    const profile = await this.mobileOAuth.verifyGoogleIdToken(dto.idToken);
    const { user, access_token, refresh_token } =
      await this.service.socialLoginFromVerifiedProfile(profile);
    return { user, access_token, refresh_token };
  }

  @Throttle({ default: { limit: 5, ttl: 10000 } })
  @Post('/apple/mobile')
  @ApiOperation({
    summary: 'Apple Sign-In (mobile native SDK) - hozircha implement qilinmagan',
    description:
      "Mobile ilovadan native Apple Sign-In SDK orqali olingan identityToken'ni verify " +
      "qiladi. Hozircha implement qilinmagan - jose paketi bilan kelajakda.",
  })
  @ApiBody({ type: AppleMobileLoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiStandardErrors({
    validation: true,
    auth: true,
    throttle: true,
  })
  async appleMobile(@Body() dto: AppleMobileLoginDto) {
    const profile = await this.mobileOAuth.verifyAppleIdentityToken(
      dto.identityToken,
      dto.fullName,
    );
    const { user, access_token, refresh_token } =
      await this.service.socialLoginFromVerifiedProfile(profile);
    return { user, access_token, refresh_token };
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/login')
  @ApiOperation({
    summary: 'Login with email/phone and password',
    description:
      "Muvaffaqiyatli login bo'lsa, response body'da `access_token` qaytadi. " +
      "Swagger UI'da uni qo'lda yuqori-o'ngdagi **Authorize** tugmasi orqali `bearer` field'iga kiriting (yoki maxsus skript avtomatik qo'yadi). " +
      "Refresh token cookie'ga (`refresh_token`) o'rnatiladi.",
  })
  @ApiHeader({
    name: 'x-client-type',
    required: false,
    description: 'Mobile client uchun `mobile` yuboriladi.',
    example: 'mobile',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description:
      'Web response refresh tokenni cookie orqali beradi. Mobile response body ichida access_token va refresh_token qaytaradi.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(WebAuthResponseDto) },
        { $ref: getSchemaPath(AuthResponseDto) },
      ],
    },
  })
  @ApiStandardErrors({
    validation: true,
    auth: true,
    throttle: true,
    notFound: true,
    messages: {
      unauthorized: "Login yoki parol noto'g'ri",
      notFound: 'Bunday foydalanuvchi topilmadi',
    },
  })
  async login(
    @Body()
    dto: LoginDto,
    @Req() req: IRequestCustom,
    @Res() res: Response,
  ) {
    try {
      const identifier = (dto.identifier || dto.email || '').trim();
      const { user, refresh_token, access_token } = await this.service.login({
        identifier,
        password: dto.password,
      });

      return sendAuthResponse({
        req,
        res,
        user,
        tokens: { access_token, refresh_token },
      });
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/register')
  @ApiOperation({ summary: 'Register user and send OTP' })
  @ApiBody({ type: CreateUserDto })
  @ApiOkResponse({
    description:
      'User yaratiladi yoki tasdiqlanmagan user yangilanadi, OTP yuboriladi. Token OTP confirmdan keyin beriladi.',
    type: MessageResponseDto,
  })
  @ApiStandardErrors({ validation: true, conflict: true, throttle: true })
  async register(@Body() dto: CreateUserDto, @Req() req: IRequestCustom) {
    try {
      const language = detectSmsLanguage(req);
      const result = await this.service.register({ ...dto, language });
      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/confirm-otp')
  @ApiOperation({ summary: 'Confirm registration OTP and login user' })
  @ApiHeader({
    name: 'x-client-type',
    required: false,
    description: 'Mobile client uchun `mobile` yuboriladi.',
    example: 'mobile',
  })
  @ApiBody({ type: ConfirmOtpDto })
  @ApiOkResponse({
    description:
      'Web response refresh tokenni cookie orqali beradi. Mobile response body ichida access_token va refresh_token qaytaradi.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(WebAuthResponseDto) },
        { $ref: getSchemaPath(AuthResponseDto) },
      ],
    },
  })
  @ApiStandardErrors({
    validation: true,
    notFound: true,
    throttle: true,
    messages: {
      badRequest: "OTP noto'g'ri yoki muddati o'tgan",
      notFound: 'OTP yoki user topilmadi',
    },
  })
  async confirmOtp(
    @Body() dto: ConfirmOtpDto,
    @Req() req: IRequestCustom,
    @Res() res: Response,
  ) {
    try {
      const { user, refresh_token, access_token } =
        await this.service.confirmOtp(dto);
      return sendAuthResponse({
        req,
        res,
        user,
        tokens: { access_token, refresh_token },
      });
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/resend-otp')
  @ApiOperation({ summary: 'Resend registration OTP' })
  @ApiBody({ type: ResendOtpDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiStandardErrors({ validation: true, notFound: true, throttle: true })
  async resendOtp(@Body() { id }: ResendOtpDto, @Req() req: IRequestCustom) {
    try {
      const language = detectSmsLanguage(req);
      const result = await this.service.resendOtp(id, language);
      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/forgot-password')
  @ApiOperation({ summary: 'Send password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Parolni tiklash kodi yuboriladi va userId qaytadi.',
  })
  @ApiStandardErrors({ validation: true, notFound: true, throttle: true })
  async forgotPassword(
    @Body() { identifier, email }: ForgotPasswordDto,
    @Req() req: IRequestCustom,
  ) {
    try {
      const language = detectSmsLanguage(req);
      return await this.service.forgotPassword(
        (identifier || email || '').trim(),
        language,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error)
        throw new InternalServerErrorException(error.message);
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiStandardErrors({ validation: true, notFound: true, throttle: true })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      return await this.service.resetPassword(dto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error)
        throw new InternalServerErrorException(error.message);
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 5, ttl: 10000 } })
  @Post('/change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Change current authenticated user password' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiStandardErrors({
    auth: true,
    validation: true,
    throttle: true,
    messages: {
      badRequest:
        "Joriy parol noto'g'ri yoki yangi parol talablarga javob bermaydi",
    },
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: IRequestCustom,
  ) {
    try {
      const userId = req.user?._id as string;
      return await this.service.changePassword({
        userId,
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error)
        throw new InternalServerErrorException(error.message);
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Post('/refresh-token')
  @ApiOperation({ summary: 'Refresh user access token' })
  @ApiCookieAuth('refresh_token')
  @ApiHeader({
    name: 'x-client-type',
    required: false,
    description: 'Mobile client uchun `mobile` yuboriladi.',
    example: 'mobile',
  })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiOkResponse({
    description:
      'Web cookie flow string access_token qaytaradi. Mobile flow body ichida yangi access_token va refresh_token qaytaradi.',
    schema: {
      oneOf: [
        { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        { $ref: getSchemaPath(TokenPairResponseDto) },
      ],
    },
  })
  @ApiStandardErrors({
    auth: true,
    messages: { unauthorized: "Refresh token noto'g'ri yoki muddati o'tgan" },
  })
  async refresh(
    @Body() dto: RefreshTokenDto = {},
    @Req() req: IRequestCustom & { cookies: { refresh_token?: string } },
  ) {
    try {
      const refresh_token = req.cookies['refresh_token'] ?? dto.refresh_token;
      if (!refresh_token) return null;

      if (isMobileClient(req) || dto.refresh_token) {
        return this.service.refreshTokens(refresh_token);
      }

      return this.service.refresh(refresh_token);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Xatolik ketdi. Birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 10, ttl: 10000 } })
  @Get('/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, throttle: true })
  async findMe(@Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.findById(user?._id as string);
      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Xatolik ketdi. Birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Put('/')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, validation: true, throttle: true })
  @ApiMultipartBody(UpdateUserDto, [{ name: 'avatar' }])
  async update(
    @Body() dto: UpdateUserDto,
    @Req() req: IRequestCustom,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    try {
      const user = req.user;
      const result = await this.service.update({
        ...dto,
        user: user?._id as string,
        avatar,
      });
      return result;
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Xatolik ketdi. Birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Post('/logout')
  logout(@Res() res: Response) {
    try {
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      return res.status(200).json({
        message: 'Successfully logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }

      throw new InternalServerErrorException(
        "Xatolik ketdi. Birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }
}
