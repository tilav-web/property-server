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
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { EnumLanguage } from 'src/enums/language.enum';
import { InquiryService } from '../services/inquiry.service';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearer')
@ApiCookieAuth('access_token')
@ApiTags('Inquiry')
@ApiStandardErrors({ auth: true })
@Controller('inquiry')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Get()
  @ApiOperation({ summary: 'Sotuvchi uchun barcha inquiry’lar' })
  findAll(@Req() req: IRequestCustom) {
    try {
      const language = (req.headers['accept-language'] || 'en')
        .toLowerCase()
        .split(',')[0] as EnumLanguage;
      const user = req.user;
      return this.inquiryService.findAllForSeller({
        userId: user?._id as string,
        language,
      });
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

  @Get('my-sent')
  @ApiOperation({ summary: 'Men yuborgan barcha inquirylar' })
  findMySent(@Req() req: IRequestCustom) {
    try {
      const language = (req.headers['accept-language'] || 'en')
        .toLowerCase()
        .split(',')[0] as EnumLanguage;
      return this.inquiryService.findMySentInquiries(
        req.user?._id as string,
        language,
      );
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        "So'rovlarni yuklashda xatolik yuz berdi",
      );
    }
  }

  @Get('my-responses')
  @ApiOperation({ summary: 'Mening inquiry javoblarim' })
  findMyResponses(@Req() req: IRequestCustom) {
    try {
      const language = (req.headers['accept-language'] || 'en')
        .toLowerCase()
        .split(',')[0] as EnumLanguage;
      const user = req.user;
      return this.inquiryService.findMyInquiryResponses(
        user?._id as string,
        language,
      );
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Foydalanuvchi so'rov javoblarini yuklashda xatolik yuz berdi",
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Yangi inquiry yaratish' })
  @ApiStandardErrors({ auth: true, validation: true })
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
