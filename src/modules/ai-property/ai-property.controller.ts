import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiPropertyService } from './ai-property.service';
import { AiSearchDto } from './dto/ai-search.dto';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { EnumLanguage } from 'src/enums/language.enum';

const SUPPORTED_LANGUAGES = new Set<string>(Object.values(EnumLanguage));

function resolveLanguage(header: unknown): EnumLanguage {
  if (typeof header !== 'string') return EnumLanguage.EN;
  const first = header.split(',')[0]?.trim().toLowerCase();
  if (!first) return EnumLanguage.EN;
  return SUPPORTED_LANGUAGES.has(first)
    ? (first as EnumLanguage)
    : EnumLanguage.EN;
}

@Controller('ai-property')
export class AiPropertyController {
  constructor(private readonly aiPropertyService: AiPropertyService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('search')
  search(@Body() dto: AiSearchDto, @Req() req: IRequestCustom) {
    const language = resolveLanguage(req.headers['accept-language']);
    return this.aiPropertyService.findByPrompt({
      userPrompt: dto.prompt,
      page: dto.page ?? 1,
      limit: dto.limit ?? 5,
      language,
    });
  }
}
