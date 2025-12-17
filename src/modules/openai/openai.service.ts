import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';

interface TranslationResponse {
  en?: string;
  ru?: string;
  uz?: string;
}

interface AIResponse {
  translations: Record<string, TranslationResponse>;
  tags: string[];
}

@Injectable()
export class OpenaiService implements OnModuleInit {
  private readonly logger = new Logger(OpenaiService.name);
  private ai!: OpenAI;
  private requestQueue: Promise<void> = Promise.resolve();

  onModuleInit() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.ai = new OpenAI({ apiKey });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isValidTranslation(obj: unknown): obj is TranslationResponse {
    if (typeof obj !== 'object' || obj === null) return false;
    const translation = obj as Record<string, unknown>;
    return (
      (typeof translation.en === 'string' || translation.en === undefined) &&
      (typeof translation.ru === 'string' || translation.ru === undefined) &&
      (typeof translation.uz === 'string' || translation.uz === undefined)
    );
  }

  private isValidAIResponse(obj: unknown): obj is AIResponse {
    if (typeof obj !== 'object' || obj === null) return false;

    const response = obj as Record<string, unknown>;

    // Check if translations exists and is an object
    if (!response.translations || typeof response.translations !== 'object') {
      return false;
    }

    // Check if tags exists and is an array
    if (!Array.isArray(response.tags)) {
      return false;
    }

    return true;
  }

  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    const previousRequest = this.requestQueue;

    this.requestQueue = previousRequest
      .then(() => this.delay(450))
      .catch(() => {});

    await previousRequest;
    return fn();
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number,
    delayMs = 2000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      if (retries <= 0) throw err;

      const error = err as { status?: number; message?: string };

      if (error?.status === 429) {
        this.logger.warn(`Rate limit hit, retrying in ${delayMs * 1.5}ms...`);
        await this.delay(delayMs * 1.5);
      } else {
        this.logger.warn(`Request failed, retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
      }

      return this.withRetry(fn, retries - 1, delayMs);
    }
  }

  async translateTexts(
    texts: Record<string, string>,
  ): Promise<[string[], Record<string, TranslationResponse>]> {
    return this.queueRequest(() =>
      this.withRetry(async () => {
        const textsJson = JSON.stringify(texts, null, 2);

        const prompt = `You are a property listing translator and tag generator. 

Given these property fields, provide:
1. Translations for each field in English, Russian, and Uzbek
2. Relevant search tags/keywords in all three languages that users might search for

Input:
${textsJson}

Return ONLY valid JSON in this exact format:
{
  "translations": {
    "title": {
      "en": "English translation",
      "ru": "Russian translation",
      "uz": "Uzbek translation"
    },
    "description": {
      "en": "English translation",
      "ru": "Russian translation",
      "uz": "Uzbek translation"
    },
    "address": {
      "en": "English translation",
      "ru": "Russian translation",
      "uz": "Uzbek translation"
    }
  },
  "tags": [
    "Tashkent",
    "Toshkent",
    "Ташкент",
    "3 bedroom",
    "3 xonali",
    "3 комнатная",
    "luxury",
    "hashamatli",
    "люкс"
  ]
}

Rules for tags:
- Extract key features (bedrooms, location, property type, amenities)
- Include variations in all 3 languages
- Keep tags short (1-3 words each)
- Include 10-20 relevant tags total
- Mix of specific (location names) and general (property features) tags`;

        const response = await this.ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.3,
        });

        const output = response.choices?.[0]?.message?.content?.trim() ?? '';
        if (!output) {
          throw new Error('OpenAI returned empty response');
        }

        // JSON ni extract qilamiz
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          this.logger.warn('No valid JSON found, returning original texts');
          return this.createFallbackResponse(texts);
        }

        const parsed: unknown = JSON.parse(jsonMatch[0]);

        // Validate structure with type guard
        if (!this.isValidAIResponse(parsed)) {
          this.logger.warn('Invalid response structure');
          return this.createFallbackResponse(texts);
        }

        // Now TypeScript knows parsed is AIResponse type
        const translations: Record<string, TranslationResponse> = {};

        for (const key of Object.keys(texts)) {
          const translation = parsed.translations[key];
          if (this.isValidTranslation(translation)) {
            translations[key] = {
              en: (translation.en ?? texts[key]).trim(),
              ru: (translation.ru ?? texts[key]).trim(),
              uz: (translation.uz ?? texts[key]).trim(),
            };
          } else {
            translations[key] = {
              en: texts[key],
              ru: texts[key],
              uz: texts[key],
            };
          }
        }

        // Clean tags - remove duplicates and empty strings
        const tags = Array.from(
          new Set(
            parsed.tags
              .filter(
                (tag): tag is string =>
                  typeof tag === 'string' && tag.trim().length > 0,
              )
              .map((tag) => tag.trim()),
          ),
        );

        return [tags, translations];
      }, 3),
    );
  }

  private createFallbackResponse(
    texts: Record<string, string>,
  ): [string[], Record<string, TranslationResponse>] {
    const fallbackTranslations: Record<string, TranslationResponse> = {};

    for (const key of Object.keys(texts)) {
      fallbackTranslations[key] = {
        en: texts[key],
        ru: texts[key],
        uz: texts[key],
      };
    }

    return [[], fallbackTranslations];
  }

  async generateText(prompt: string): Promise<string> {
    return this.queueRequest(() =>
      this.withRetry(async () => {
        const response = await this.ai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: prompt.length > 100 ? 500 : 300,
          temperature: 0.7,
        });

        const output = response.choices?.[0]?.message?.content?.trim() ?? '';
        if (!output) {
          throw new Error('OpenAI returned empty response');
        }

        return output;
      }, 3),
    );
  }
}
