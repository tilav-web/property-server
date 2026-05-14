import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  findTags(@Query('q') query: string) {
    return this.tagService.findTags(query);
  }
}
