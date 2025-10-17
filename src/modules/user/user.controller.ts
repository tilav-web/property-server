import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { type Response } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from './dto/update-user.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/login')
  async login(
    @Body() dto: { email: string; password: string },
    @Res() res: Response,
  ) {
    try {
      const { user, refresh_token, access_token } =
        await this.service.login(dto);

      return res
        .cookie('refresh_token', refresh_token, {
          httpOnly: process.env.NODE_ENV === 'production',
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({ user, access_token });
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimga kirishda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/register')
  async register(@Body() dto: CreateUserDto) {
    try {
      const result = await this.service.register(dto);
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
        "Tizimga kirishda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/confirm-otp')
  async confirmOtp(
    @Body() dto: { id: string; code: string },
    @Res() res: Response,
  ) {
    try {
      const { user, refresh_token, access_token } =
        await this.service.confirmOtp(dto);
      return res
        .cookie('refresh_token', refresh_token, {
          httpOnly: process.env.NODE_ENV === 'production',
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({ user, access_token });
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimga kirishda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/resend-otp')
  async resendOtp(@Body() { id }: { id: string }) {
    try {
      const result = await this.service.resendOtp(id);
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
        "Tizimga kirishda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Post('/refresh-token')
  async refresh(
    @Req() req: IRequestCustom & { cookies: { refresh_token?: string } },
  ) {
    try {
      const refresh_token = req.cookies['refresh_token'];
      if (!refresh_token) return null;
      const result = await this.service.refresh(refresh_token);
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

  @Throttle({ default: { limit: 10, ttl: 10000 } })
  @Get('/me')
  @UseGuards(AuthGuard('jwt'))
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

  @Put('/')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('avatar'))
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
        httpOnly: process.env.NODE_ENV === 'production',
        secure: true,
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

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/like/:id')
  @UseGuards(AuthGuard('jwt'))
  async handleLike(@Param('id') id: string, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.handleLike({
        property: id,
        user: user?._id as string,
      });
      return result;
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

  @Get('/likes')
  @UseGuards(AuthGuard('jwt'))
  async findLike(@Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.findLikes(user?._id as string);
      return result;
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
