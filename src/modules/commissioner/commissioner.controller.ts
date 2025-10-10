import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommissionerService } from './commissioner.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../user/guards/role.guard';
import { Roles } from '../user/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCommissionerDto } from './dto/create-commissioner.dto';
import type { MulterFile } from 'src/interfaces/multer-file.interface';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';

@Controller('commissioners')
export class CommissionerController {
  constructor(private readonly commissionerService: CommissionerService) {}

  @Post('/')
  @Roles('seller')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @UseInterceptors(FileInterceptor('contract_file'))
  async create(
    @Body() dto: CreateCommissionerDto,
    @UploadedFile() contract_file: MulterFile,
    @Req() req: IRequestCustom,
  ) {
    return this.commissionerService.create({
      ...dto,
      contract_file,
      user: req.user?._id as string,
    });
  }
}
