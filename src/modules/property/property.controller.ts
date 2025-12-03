import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Req,
  HttpException,
  InternalServerErrorException,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PropertyService } from './property.service';
import { type CreatePropertyDto } from './dto/create-property.dto';
import { AuthGuard } from '@nestjs/passport';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { FilterMyPropertiesDto } from './dto/filter-my-properties.dto';
import type { Request } from 'express';
import { EnumLanguage } from 'src/enums/language.enum';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photos', maxCount: 10 },
      { name: 'videos', maxCount: 3 },
    ]),
  )
  create(
    @UploadedFiles()
    files: {
      photos: Express.Multer.File[];
      videos: Express.Multer.File[];
    },
    @Body() dto: CreatePropertyDto,
    @Req() req: IRequestCustom,
  ) {
    try {
      return this.propertyService.create({ dto, files, author: req.user?._id });
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

  @Get('/my')
  @UseGuards(AuthGuard('jwt'))
  async findMyProperties(
    @Req() req: IRequestCustom,
    @Query() filter: FilterMyPropertiesDto,
  ) {
    const language = (req.headers['accept-language'] || 'uz')
      .toLowerCase()
      .split(',')[0] as EnumLanguage;
    const result = await this.propertyService.findMyProperties({
      author: req.user?._id,
      ...filter,
      language,
    });
    return result;
  }

  @Get('/:id')
  async findById(@Param('id') id: string, @Req() req: Request) {
    const language = (req.headers['accept-language'] || 'uz')
      .toLowerCase()
      .split(',')[0] as EnumLanguage;

    const result = await this.propertyService.findById({ id, language });
    return result;
  }

  @Get('/')
  async findAll(
    @Req() req: IRequestCustom,
    @Query() filter: FindAllPropertiesDto,
  ) {
    const language = (req.headers['accept-language'] || 'uz')
      .toLowerCase()
      .split(',')[0] as EnumLanguage;
    return this.propertyService.findAll({ language, ...filter });
  }
}
