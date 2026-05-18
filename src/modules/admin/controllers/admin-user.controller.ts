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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminUserService } from '../services/admin-user.service';
import { FindUsersDto } from '../dto/find-users.dto';
import { AdminGuard } from '../guards/admin.guard';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Users')
@ApiStandardErrors({ auth: true, forbidden: true })
@Controller('admins/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

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
}
