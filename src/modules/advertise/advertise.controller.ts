import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdvertiseService } from './advertise.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';

@Controller('advertise')
export class AdvertiseController {
  constructor(private readonly service: AdvertiseService) {}

  @Get('/public')
  async findPublic(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: EnumAdvertiseType,
    @Query('sort') sort?: string,
  ) {
    try {
      let sortOptions: Record<string, 1 | -1> | undefined;
      if (sort) {
        try {
          sortOptions = JSON.parse(sort);
        } catch (e) {
          // ignore invalid sort json
        }
      }

      const result = await this.service.findAll({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        type,
        sample: true,
        sort: sortOptions,
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

  @Put(':id/view')
  async incrementView(@Param('id') id: string) {
    return this.service.incrementView(id);
  }

  @Put(':id/click')
  async incrementClick(@Param('id') id: string) {
    return this.service.incrementClick(id);
  }


  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async create(
    @UploadedFiles()
    files: {
      image: Express.Multer.File[];
    },
    @Body() dto: CreateAdvertiseDto,
    @Req() req: IRequestCustom,
  ) {
    try {
      const user = req.user;
      const result = await this.service.create({
        dto,
        author: user?._id as string,
        files,
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

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  async findMy(@Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.findMy(user?._id as string);
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

  @Get('/price/calculus')
  priceCalculus(@Query() dto: { days: string }) {
    return this.service.priceCalculus(parseInt(dto.days, 10));
  }

  @Get('type/:type')
  async findOneByType(@Param('type') type: EnumAdvertiseType) {
    return this.service.findOneByType(type);
  }
}
