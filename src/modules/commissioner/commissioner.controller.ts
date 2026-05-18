import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommissionerService } from './commissioner.service';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../user/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { CreateCommissionerDto } from './dto/create-commissioner.dto';
import { AuthRoleGuard } from '../user/guards/role.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@ApiTags('Commissioners')
@Controller('commissioners')
export class CommissionerController {
  constructor(private readonly commissionerService: CommissionerService) {}

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('/')
  @Roles('legal')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @UseInterceptors(FileInterceptor('contract_file'))
  @ApiOperation({ summary: 'Commissioner yaratish (faqat legal role)' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    validation: true,
    throttle: true,
  })
  @ApiMultipartBody(CreateCommissionerDto, [
    { name: 'contract_file', required: true },
  ])
  async create(
    @Body() dto: CreateCommissionerDto,
    @UploadedFile() contract_file: Express.Multer.File,
    @Req() req: IRequestCustom,
  ) {
    return this.commissionerService.create({
      ...dto,
      contract_file,
      user: req.user?._id as string,
    });
  }
}
