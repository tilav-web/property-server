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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DeveloperService } from './developer.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { AdminGuard } from '../admin/guards/admin.guard';

const FILE_FIELDS = [
  { name: 'logo', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
];

@Controller('developers')
export class DeveloperController {
  constructor(private readonly service: DeveloperService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 50) : 20,
      search,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // ---- Admin endpoints ----

  @UseGuards(AdminGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS))
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
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
