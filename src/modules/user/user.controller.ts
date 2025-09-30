import {
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Post,
  Res,
} from '@nestjs/common';
import { UserService } from './user.service';
import { type Response } from 'express';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

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
}
