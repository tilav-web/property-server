import { Body, Controller } from '@nestjs/common';
import { CommissionerService } from './commissioner.service';

@Controller('commissioners')
export class CommissionerController {
  constructor(private readonly commissionerService: CommissionerService) {}

  // @Throttle({ default: { limit: 3, ttl: 10000 } })
  // @Post('/')
  // @Roles('legal')
  // @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  // @UseInterceptors(FileInterceptor('contract_file'))
  // async create(
  //   @Body() dto: CreateCommissionerDto,
  //   @UploadedFile() contract_file: MulterFile,
  //   @Req() req: IRequestCustom,
  // ) {
  //   return this.commissionerService.create({
  //     ...dto,
  //     contract_file,
  //     user: req.user?._id as string,
  //   });
  // }
}
