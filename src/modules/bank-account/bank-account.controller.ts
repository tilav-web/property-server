import {
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BankAccountService } from './bank-account.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../user/guards/role.guard';
import { Roles } from '../user/decorators/roles.decorator';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';

@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly service: BankAccountService) {}

  @Post('/')
  @Roles('seller')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  async create(@Body() dto: CreateBankAccountDto, @Req() req: IRequestCustom) {
    try {
      const user = req.user;
      const result = await this.service.create({
        ...dto,
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
}
