import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Put,
  Post,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminUserService } from '../services/admin-user.service';
import { FindUsersDto } from '../dto/find-users.dto';
import { AdminGuard } from '../guards/admin.guard';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { PremiumService } from '../../premium/premium.service';
import { GrantPremiumDto } from '../dto/grant-premium.dto';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Users')
@ApiStandardErrors({ auth: true, forbidden: true })
@Controller('admins/users')
export class AdminUserController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly premiumService: PremiumService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Userlar ro‘yxati (admin)' })
  async findUsers(@Query() dto: FindUsersDto) {
    return this.adminUserService.findUsers(dto);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Update user by admin' })
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  @ApiMultipartBody(UpdateUserDto, [{ name: 'avatar' }])
  async update(
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpeg|png|webp|jpg)' }),
        ],
      }),
    )
    avatarFile?: Express.Multer.File,
  ) {
    return this.adminUserService.update(userId, dto, avatarFile);
  }

  @Post(':id/premium')
  @ApiOperation({
    summary: 'User ga Premium berish (yoki uzaytirish)',
    description:
      "Adminstrator qo'lda Premium beradi. Faol Premium bo'lsa ustiga " +
      "qo'shiladi. To'lovsiz — promotion, partner, jurnalist va h.k. uchun.",
  })
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  async grantPremium(
    @Param('id') userId: string,
    @Body() dto: GrantPremiumDto,
  ) {
    return this.premiumService.grantPremium(userId, dto.days);
  }

  @Delete(':id/premium')
  @ApiOperation({
    summary: "User ning Premium'ini bekor qilish (darhol)",
  })
  @ApiStandardErrors({ auth: true, notFound: true })
  async revokePremium(@Param('id') userId: string) {
    return this.premiumService.revokePremium(userId);
  }
}
