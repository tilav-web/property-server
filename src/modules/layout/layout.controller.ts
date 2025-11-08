import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Query,
} from '@nestjs/common';
import { LayoutService } from './layout.service';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { EnumPropertyPurpose } from 'src/enums/property-purpose.enum';

@Controller('layout')
export class LayoutController {
  constructor(private readonly service: LayoutService) {}

  @Get('main-page')
  async getMainPageLayout(
    @Query('category') category?: EnumPropertyCategory,
  ) {
    try {
      return await this.service.getMainPageLayout(category);
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get main page layout.');
    }
  }

  @Get('category-page')
  async getCategoryPageLayout(
    @Query('category') category?: EnumPropertyCategory,
    @Query('page') page?: string,
  ) {
    try {
      return await this.service.getCategoryPageLayout({
        category,
        page: page ? parseInt(page, 10) : 1,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to get category page layout.',
      );
    }
  }

  @Get('filter-nav')
  async getFilterNavLayout(
    @Query('purpose') purpose?: EnumPropertyPurpose,
    @Query('category') category?: EnumPropertyCategory,
    @Query('price_type') price_type?: EnumPropertyPriceType,
  ) {
    try {
      return await this.service.getFilterNavLayout({
        purpose,
        category,
        price_type,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to get filter nav layout.',
      );
    }
  }
}
