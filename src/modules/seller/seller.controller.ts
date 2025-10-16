import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SellerService } from './seller.service';
import { AuthGuard } from '@nestjs/passport';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';
import { CreateYttSellerDto } from './dto/create-ytt-seller.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthRoleGuard } from '../user/guards/role.guard';
import { Roles } from '../user/decorators/roles.decorator';
import { CreateMchjSellerDto } from './dto/create-mchj-seller.dto';
import { CreateSelfEmployedSellerDto } from './dto/self-employed-seller.dto';
import { MulterFile } from 'src/interfaces/multer-file.interface';
import { Throttle } from '@nestjs/throttler';

@Controller('sellers')
export class SellerController {
  constructor(private readonly service: SellerService) {}

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  async createSeller(
    @Body()
    {
      business_type,
      passport,
    }: { business_type: EnumSellerBusinessType; passport: string },
    @Req() req: IRequestCustom,
  ) {
    try {
      const user = req.user;
      const result = await this.service.createSeller({
        business_type,
        passport,
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

  @Throttle({ default: { limit: 5, ttl: 10000 } })
  @Get('/me')
  @UseGuards(AuthGuard('jwt'))
  async findSellerByUser(@Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.findSellerByUser(user?._id as string);
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

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/ytt')
  @Roles('seller')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'passport_file', maxCount: 1 },
      { name: 'ytt_certificate_file', maxCount: 1 },
      { name: 'vat_file', maxCount: 1 },
    ]),
  )
  async createYttSeller(
    @Body() dto: CreateYttSellerDto,
    @UploadedFiles()
    files: {
      passport_file?: MulterFile[];
      ytt_certificate_file?: MulterFile[];
      vat_file?: MulterFile[];
    },
  ) {
    try {
      return this.service.createYttSeller(dto, files);
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
  @Post('/mchj')
  @Roles('seller')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'ustav_file', maxCount: 1 },
      { name: 'mchj_license', maxCount: 1 },
      { name: 'director_appointment_file', maxCount: 1 },
      { name: 'director_passport_file', maxCount: 1 },
      { name: 'legal_address_file', maxCount: 1 },
      { name: 'kadastr_file', maxCount: 1 },
      { name: 'vat_file', maxCount: 1 },
    ]),
  )
  async createMchjSeller(
    @Body() dto: CreateMchjSellerDto,
    @UploadedFiles()
    files: {
      ustav_file?: MulterFile[];
      mchj_license?: MulterFile[];
      director_appointment_file?: MulterFile[];
      director_passport_file?: MulterFile[];
      legal_address_file?: MulterFile[];
      kadastr_file?: MulterFile[];
      vat_file?: MulterFile[];
    },
  ) {
    try {
      return this.service.createMchjSeller(dto, files);
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
  @Post('/self-employed')
  @Roles('seller')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'passport_file', maxCount: 1 },
      { name: 'self_employment_certificate', maxCount: 1 },
      { name: 'vat_file', maxCount: 1 },
    ]),
  )
  async createSelfEmployedSeller(
    @Body() dto: CreateSelfEmployedSellerDto,
    @UploadedFiles()
    files: {
      passport_file?: MulterFile[];
      self_employment_certificate?: MulterFile[];
      vat_file?: MulterFile[];
    },
  ) {
    try {
      return this.service.createSelfEmployedSeller(dto, files);
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
