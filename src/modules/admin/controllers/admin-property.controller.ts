import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Body,
  Put,
  Post,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPropertyService } from '../services/admin-property.service';
import { FindPropertiesDto } from '../dto/find-properties.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { RemovePhotoDto } from '../dto/remove-photo.dto';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Properties')
@ApiStandardErrors({ auth: true })
@Controller('admins/properties')
export class AdminPropertyController {
  constructor(private readonly adminPropertyService: AdminPropertyService) {}

  @Get()
  @ApiOperation({ summary: "E'lonlar ro'yxati (admin)" })
  async findAll(@Query() dto: FindPropertiesDto) {
    return this.adminPropertyService.findAll(dto);
  }

  @Get('/user/:userId')
  @ApiOperation({ summary: "Foydalanuvchi bo'yicha e'lonlar" })
  @ApiStandardErrors({ auth: true, notFound: true })
  async findByUser(@Param('userId') userId: string) {
    return this.adminPropertyService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: "E'lon tafsiloti" })
  @ApiStandardErrors({ auth: true, notFound: true })
  async findOne(@Param('id') id: string) {
    return this.adminPropertyService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: "E'lonni yangilash (admin)" })
  @ApiStandardErrors({ auth: true, notFound: true, validation: true })
  async update(
    @Param('id') propertyId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.adminPropertyService.update(propertyId, dto);
  }

  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('photos', 25))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "E'longa rasm qo'shish (admin)" })
  @ApiStandardErrors({ auth: true, notFound: true })
  async addPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.adminPropertyService.addPhotos(id, files ?? []);
  }

  @Delete(':id/photos')
  @ApiOperation({ summary: "E'londan rasm o'chirish (admin)" })
  @ApiStandardErrors({ auth: true, notFound: true, validation: true })
  async removePhoto(@Param('id') id: string, @Body() dto: RemovePhotoDto) {
    return this.adminPropertyService.removePhoto(id, dto.url);
  }

  @Delete(':id')
  @ApiOperation({ summary: "E'lonni o'chirish (admin)" })
  @ApiStandardErrors({ auth: true, notFound: true })
  async delete(@Param('id') id: string) {
    return this.adminPropertyService.delete(id);
  }
}
