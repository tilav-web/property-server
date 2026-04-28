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
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { EnumProjectStatus } from './project.schema';
import { AdminGuard } from '../admin/guards/admin.guard';

const FILE_FIELDS = [
  { name: 'photos', maxCount: 20 },
  { name: 'brochure', maxCount: 1 },
];

@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('developer') developer?: string,
    @Query('city') city?: string,
    @Query('status') status?: EnumProjectStatus,
    @Query('is_featured') is_featured?: string,
    @Query('sort')
    sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular',
  ) {
    return this.service.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 50) : 12,
      search,
      developer,
      city,
      status,
      is_featured: is_featured === 'true' ? true : undefined,
      sort,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.service.findById(id, true);
  }

  // ---- Admin endpoints ----

  @UseGuards(AdminGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS))
  async create(
    @Body() dto: CreateProjectDto,
    @UploadedFiles()
    files?: {
      photos?: Express.Multer.File[];
      brochure?: Express.Multer.File[];
    },
  ) {
    return this.service.create({ dto, files });
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @UploadedFiles()
    files?: {
      photos?: Express.Multer.File[];
      brochure?: Express.Multer.File[];
    },
  ) {
    return this.service.update({ id, dto, files });
  }

  @UseGuards(AdminGuard)
  @Delete(':id/photo')
  async deletePhoto(@Param('id') id: string, @Query('url') url: string) {
    return this.service.removePhoto({ id, url });
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
