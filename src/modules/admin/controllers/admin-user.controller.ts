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
import { AdminUserService } from '../services/admin-user.service';
import { FindUsersDto } from '../dto/find-users.dto';
import { AdminGuard } from '../guards/admin.guard';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(AdminGuard)
@Controller('admins/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  async findUsers(@Query() dto: FindUsersDto) {
    return this.adminUserService.findUsers(dto);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('avatar'))
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
