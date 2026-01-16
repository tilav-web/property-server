import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { AdminTagService, PaginatedTags } from '../services/admin-tag.service'; // Import PaginatedTags
import { Tag } from '../../tag/schemas/tag.schema';

@UseGuards(AdminGuard)
@Controller('admins/tags')
export class AdminTagController {
  constructor(private readonly adminTagService: AdminTagService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') query?: string,
  ): Promise<PaginatedTags> {
    return this.adminTagService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      query,
    );
  }

  @Post()
  async create(@Body('value') value: string): Promise<Tag> {
    return this.adminTagService.create(value);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.adminTagService.remove(id);
  }
}
