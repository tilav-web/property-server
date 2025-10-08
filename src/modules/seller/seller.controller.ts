import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SellerService } from './seller.service';
import { AuthGuard } from '@nestjs/passport';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';

@Controller('sellers')
export class SellerController {
  constructor(private readonly service: SellerService) {}

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
}
