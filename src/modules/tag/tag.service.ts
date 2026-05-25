import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from './schemas/tag.schema';

const MAX_TAG_LENGTH = 50;
const SUGGEST_LIMIT = 10;
const CACHE_TTL_MS = 5 * 60_000;
const REGEX_META = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (s: string): string => s.replace(REGEX_META, String.raw`\$&`);

interface CacheEntry {
  expiresAt: number;
  value: Pick<Tag, 'value'>[];
}

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
  ) {}

  /**
   * OpenAI'dan kelgan tag'larni DB'ga upsert qiladi. Bo'sh va juda uzun
   * tag'lar tashlanadi, takrorlar bir marta yoziladi.
   */
  async saveTags(tags: string[]): Promise<void> {
    try {
      const uniqueTags = Array.from(
        new Set(tags.map((tag) => tag.toLowerCase().trim())),
      ).filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH);

      if (uniqueTags.length === 0) return;

      const operations = uniqueTags.map((tag) => ({
        updateOne: {
          filter: { value: tag },
          update: { $setOnInsert: { value: tag } },
          upsert: true,
        },
      }));

      await this.tagModel.bulkWrite(operations, { ordered: false });
      this.invalidateCache();
    } catch (error) {
      this.logger.error('saveTags xato', error as Error);
    }
  }

  /**
   * Tag autocomplete: prefix match (case-insensitive), alphabetic sort, 10 ta.
   * Bo'sh query → birinchi 10 tag (UI ochilganda ko'rinsin).
   * 5 daqiqali in-memory cache. Tag yangilanganda invalidate bo'ladi.
   */
  async findTags(query: string): Promise<Pick<Tag, 'value'>[]> {
    try {
      const trimmed = (query ?? '').trim().toLowerCase();
      const cacheKey = trimmed.length > 0 ? `q:${trimmed}` : 'q:__empty__';

      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }

      const filter = trimmed
        ? { value: { $regex: `^${escapeRegex(trimmed)}`, $options: 'i' } }
        : {};

      const result = await this.tagModel
        .find(filter, { value: 1, _id: 0 })
        .sort({ value: 1 })
        .limit(SUGGEST_LIMIT)
        .lean<Pick<Tag, 'value'>[]>()
        .exec();

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: result,
      });
      return result;
    } catch (error) {
      this.logger.error('findTags xato', error as Error);
      return [];
    }
  }

  /**
   * Tag yangilanganda yoki o'chirilganda cache'ni tozalash uchun.
   * saveTags ichida avtomatik chaqiriladi; tashqi mutationlar (admin
   * CRUD) keyin shu metodni qo'lda chaqirishi kerak.
   */
  invalidateCache(): void {
    this.cache.clear();
  }
}
