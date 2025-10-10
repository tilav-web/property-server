import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RegionService } from './region.service';

@Controller('regions')
export class RegionController {
  constructor(private readonly service: RegionService) {}

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
}
