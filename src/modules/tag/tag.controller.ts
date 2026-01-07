import { Controller, Get, Query } from '@nestjs/common';
import { TagService } from './tag.service';

@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  findTags(@Query('q') query: string) {
    return this.tagService.findTags(query);
  }
}
