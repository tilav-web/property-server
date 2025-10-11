import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
} from '@nestjs/common';
import { DistrictService } from './district.service';

@Controller('districts')
export class DistrictController {
  constructor(private readonly service: DistrictService) {}

  @Get('/')
  async findAll() {
    try {
      const result = await this.service.findAll();
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

  @Get('/region/code/:code')
  async findAllByRegionCode(@Param('code') code: string) {
    try {
      const result = await this.service.findAllByRegionCode(code);
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

  @Get('/region/id/:id')
  async findAllByRegionId(@Param('id') id: string) {
    try {
      const result = await this.service.findAllByRegionId(id);
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
