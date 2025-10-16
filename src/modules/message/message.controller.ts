import {
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { AuthGuard } from '@nestjs/passport';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';

@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Get('/id/:id')
  async findById(@Param('id') id: string) {
    try {
      const result = await this.service.findById(id);
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

  @Get('/user')
  @UseGuards(AuthGuard('jwt'))
  async findByUser(@Req() req: IRequestCustom) {
    try {
      const user = req?.user;
      const result = await this.service.findByUser(user?._id as string);
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

  @Get('/property/:id')
  async findByProperty(@Param('id') id: string) {
    try {
      const result = await this.service.findByProperty(id);
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

  @Delete('/:id')
  async delete(@Param('id') id: string, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.delete({
        id,
        user: user?._id as string,
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
        "Tizimga kirishda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }
}
