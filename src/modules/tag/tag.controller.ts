import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: 'Search tags' })
  @ApiQuery({ name: 'q', required: false })
  findTags(@Query('q') query: string) {
    return this.tagService.findTags(query);
  }
}
