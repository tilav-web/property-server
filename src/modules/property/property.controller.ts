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
  Delete,
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
import { CreateMessageDto } from '../message/dto/create-message.dto';

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

  // @Patch(':id')
  // @UseGuards(AuthGuard('jwt'))
  // @UseInterceptors(
  //   FileFieldsInterceptor([
  //     { name: 'photos', maxCount: 10 },
  //     { name: 'videos', maxCount: 3 },
  //   ]),
  // )
  // update(
  //   @Param('id') id: string,
  //   @UploadedFiles()
  //   files: {
  //     photos?: Express.Multer.File[];
  //     videos?: Express.Multer.File[];
  //   },
  //   @Body() dto: UpdatePropertyDto,
  //   @Req() req: IRequestCustom,
  // ) {
  //   try {
  //     return this.propertyService.update({
  //       id,
  //       dto,
  //       files,
  //       author: req.user?._id,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException('Failed to update property.');
  //   }
  // }

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

  @Delete('/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteById(@Param('id') id: string, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      if (!user) {
        throw new HttpException('Unauthorized', 401);
      }
      const result = await this.propertyService.remove({
        id,
        userId: user._id,
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
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Post('/message')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(@Body() dto: CreateMessageDto, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.propertyService.sendMessage({
        dto,
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
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Get('/categories/list')
  async getCategories() {
    return this.propertyService.getCategories();
  }
}
