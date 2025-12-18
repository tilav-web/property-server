import { Body, Controller, Post, Req } from '@nestjs/common';
import { AiPropertyService } from './ai-property.service';
import { AiSearchDto } from './dto/ai-search.dto';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { EnumLanguage } from 'src/enums/language.enum';

@Controller('ai-property')
export class AiPropertyController {
  constructor(private readonly aiPropertyService: AiPropertyService) {}

  @Post('search')
  search(@Body() dto: AiSearchDto, @Req() req: IRequestCustom) {
    const language = req.headers['accept-language'] as EnumLanguage;
    return this.aiPropertyService.findByPrompt({
      userPrompt: dto.prompt,
      page: dto.page ?? 1,
      limit: dto.limit ?? 5,
      language,
    });
  }
}
