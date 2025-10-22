
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpException,
  InternalServerErrorException,
  Get,
} from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';

@Controller('inquiry')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Req() req: IRequestCustom, @Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    try {
      const user = req.user;
      return this.inquiryService.findAllForSeller(user?._id as string, +page, +limit);
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "So'rovlarni yuklashda xatolik yuz berdi",
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateInquiryDto, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      return this.inquiryService.create({ ...dto, user: user?._id as string });
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
}

