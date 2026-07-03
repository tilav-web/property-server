import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DeveloperService } from './developer.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { AdminGuard } from '../admin/guards/admin.guard';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

const FILE_FIELDS = [
  { name: 'logo', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
];

@ApiTags('Developers')
@Controller('developers')
export class DeveloperController {
  constructor(private readonly service: DeveloperService) {}

  @Get()
  @ApiOperation({ summary: 'Developerlar ro‘yxati' })
  @ApiStandardErrors({ validation: true })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      search,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Developer tafsiloti' })
  @ApiStandardErrors({ notFound: true })
  async getOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // ---- Admin endpoints ----

  @UseGuards(AdminGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS))
  @ApiOperation({ summary: 'Create developer' })
  @ApiBearerAuth('bearer')
  @ApiStandardErrors({ auth: true, validation: true })
  @ApiMultipartBody(CreateDeveloperDto, [{ name: 'logo' }, { name: 'cover' }])
  async create(
    @Body() dto: CreateDeveloperDto,
    @UploadedFiles()
    files?: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    return this.service.create({ dto, files });
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS))
  @ApiOperation({ summary: 'Update developer' })
  @ApiBearerAuth('bearer')
  @ApiStandardErrors({ auth: true, notFound: true, validation: true })
  @ApiMultipartBody(UpdateDeveloperDto, [{ name: 'logo' }, { name: 'cover' }])
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeveloperDto,
    @UploadedFiles()
    files?: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    return this.service.update({ id, dto, files });
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Developer o‘chirish (admin)' })
  @ApiBearerAuth('bearer')
  @ApiStandardErrors({ auth: true, notFound: true })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
