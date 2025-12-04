import { Body, Controller, Post } from '@nestjs/common';
import { AiPropertyService } from './ai-property.service';
import { AiSearchDto } from './dto/ai-search.dto';

@Controller('ai-property')
export class AiPropertyController {
  constructor(private readonly aiPropertyService: AiPropertyService) {}

  @Post('search')
  search(@Body() dto: AiSearchDto) {
    return this.aiPropertyService.findByPrompt(dto.prompt, dto.page, dto.limit);
  }
}
