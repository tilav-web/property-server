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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminTagService, PaginatedTags } from '../services/admin-tag.service';
import { Tag } from '../../tag/schemas/tag.schema';
import { CreateTagDto } from '../dto/create-tag.dto';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Tags')
@ApiStandardErrors({ auth: true })
@Controller('admins/tags')
export class AdminTagController {
  constructor(private readonly adminTagService: AdminTagService) {}

  @Get()
  @ApiOperation({ summary: 'Taglar ro‘yxati (paginated, qidiriladigan)' })
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
  @ApiStandardErrors({ auth: true, validation: true, conflict: true })
  async create(@Body() dto: CreateTagDto): Promise<Tag> {
    return this.adminTagService.create(dto.value);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Tagni o‘chirish' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.adminTagService.remove(id);
  }
}
