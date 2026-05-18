import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: 'Search tags' })
  @ApiQuery({ name: 'q', required: false })
  @ApiStandardErrors({ validation: true })
  findTags(@Query('q') query: string) {
    return this.tagService.findTags(query);
  }
}
