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
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminTagService, PaginatedTags } from '../services/admin-tag.service'; // Import PaginatedTags
import { Tag } from '../../tag/schemas/tag.schema';
import { CreateTagDto } from '../dto/create-tag.dto';

@UseGuards(AdminGuard)
@ApiTags('Admin Tags')
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
  @ApiOperation({ summary: 'Create tag' })
  @ApiBody({ type: CreateTagDto })
  async create(@Body() dto: CreateTagDto): Promise<Tag> {
    return this.adminTagService.create(dto.value);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.adminTagService.remove(id);
  }
}
