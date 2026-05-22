import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  NotAcceptableException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdvertiseService } from './advertise.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';
import { UpdateAdvertiseDto } from './dto/update-advertise.dto';
import { Types } from 'mongoose';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@ApiTags('Advertise')
@Controller('advertise')
export class AdvertiseController {
  constructor(private readonly service: AdvertiseService) {}

  @Get('/public')
  @ApiOperation({ summary: 'List public advertises' })
  @ApiStandardErrors({ validation: true })
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
  @ApiOperation({ summary: 'Reklama ko‘rishlar sonini oshirish' })
  @ApiStandardErrors({ notFound: true })
  async incrementView(@Param('id') id: string) {
    return this.service.incrementView(id);
  }

  @Put(':id/click')
  @ApiOperation({ summary: 'Reklama bosishlar sonini oshirish' })
  @ApiStandardErrors({ notFound: true })
  async incrementClick(@Param('id') id: string) {
    return this.service.incrementClick(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @ApiOperation({ summary: 'Update advertise' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    notFound: true,
    validation: true,
  })
  @ApiMultipartBody(UpdateAdvertiseDto, [{ name: 'image' }])
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdvertiseDto,
    @Req() req: IRequestCustom,
    @UploadedFiles()
    files?: {
      image: Express.Multer.File[];
    },
  ) {
    try {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedException('Ruxsat berilmagan');
      }
      return await this.service.update(id, dto, user._id, files);
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

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @ApiOperation({ summary: 'Reklamani o‘chirish' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, forbidden: true, notFound: true })
  async remove(@Param('id') id: string, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedException('Ruxsat berilmagan');
      }
      return await this.service.remove(id, user._id);
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

  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @ApiOperation({ summary: 'Create advertise' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true, validation: true })
  @ApiMultipartBody(CreateAdvertiseDto, [{ name: 'image' }])
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
  @ApiOperation({ summary: 'Mening reklamalarim' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({ auth: true })
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

  @Get(':id/checkout-url')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: "Mavjud reklama uchun Payme checkout URL'ni qaytaradi",
  })
  @ApiStandardErrors({ auth: true, notFound: true, validation: true })
  async getCheckoutUrl(
    @Param('id') advertiseId: string,
    @Req() req: IRequestCustom,
  ) {
    return this.service.getCheckoutUrl({
      advertiseId,
      userId: String(req.user!._id),
    });
  }

  @Get('type/:type')
  async findOneByType(@Param('type') type: EnumAdvertiseType) {
    return this.service.findOneByType(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Reklama tafsiloti' })
  @ApiStandardErrors({ notFound: true })
  async findOne(@Param('id') id: string) {
    if (!id) throw new NotAcceptableException('Ads not found!');
    return this.service.findById(id);
  }
}
