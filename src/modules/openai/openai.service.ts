import { Injectable, Logger } from '@nestjs/common';
import { Language } from 'src/common/language/language.schema';
import OpenAI from 'openai';

interface TranslationResponse {
  en?: string;
  ru?: string;
  uz?: string;
}

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly ai: OpenAI;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor() {
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
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    const translation = obj as Record<string, unknown>;
    return (
      (typeof translation.en === 'string' || translation.en === undefined) &&
      (typeof translation.ru === 'string' || translation.ru === undefined) &&
      (typeof translation.uz === 'string' || translation.uz === undefined)
    );
  }

  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    const previousRequest = this.requestQueue;
    let resolver: (() => void) | undefined;

    this.requestQueue = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    await previousRequest;

    try {
      return await fn();
    } finally {
      await this.delay(450); // Rate limit protection
      if (resolver) {
        resolver();
      }
    }
  }

  private async translateOne(text: string, retries = 3): Promise<Language> {
    return this.queueRequest(async () => {
      try {
        const prompt = `Translate this text exactly to English, Russian, and Uzbek.
Return ONLY valid JSON in this format (no extra text):

{
  "en": "English translation",
  "ru": "Russian translation",
  "uz": "Uzbek translation"
}

Text: ${text}

If a translation is not possible, return the original text for that language.`;

        const response = await this.ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500, // Increased for 3 languages
          temperature: 0.3,
        });

        const output = response.choices?.[0]?.message?.content ?? '';

        if (!output.trim()) {
          if (retries > 0) {
            this.logger.warn('OpenAI returned no text, retrying...');
            await this.delay(2000);
            return this.translateOne(text, retries - 1);
          } else {
            throw new Error('OpenAI returned empty response after retries');
          }
        }

        // Extract JSON safely
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          this.logger.warn('No valid JSON found in response');
          return { en: text, ru: text, uz: text };
        }

        try {
          const parsed: unknown = JSON.parse(jsonMatch[0]);

          if (!this.isValidTranslation(parsed)) {
            this.logger.warn('Invalid translation format received');
            return { en: text, ru: text, uz: text };
          }

          return {
            en: (parsed.en ?? text).trim(),
            ru: (parsed.ru ?? text).trim(),
            uz: (parsed.uz ?? text).trim(),
          };
        } catch (parseErr) {
          this.logger.error('JSON parse failed', parseErr);
          return { en: text, ru: text, uz: text };
        }
      } catch (err: any) {
        this.logger.warn(
          `OpenAI translate error: ${err?.message ?? 'Unknown error'}`,
        );

        // Retry on rate limit
        if (err?.status === 429 && retries > 0) {
          await this.delay(3000);
          return this.translateOne(text, retries - 1);
        }

        throw err;
      }
    });
  }

  async translateTexts(
    texts: Record<string, string>,
  ): Promise<Record<string, Language>> {
    const entries = Object.entries(texts).filter(([_, v]) => v?.trim());

    // Process 5 translations in parallel
    const chunks = this.chunkArray(entries, 5);
    const result: Record<string, Language> = {};

    for (const chunk of chunks) {
      const promises = chunk.map(([key, value]) =>
        this.translateOne(value)
          .then((translation) => ({ key, translation }))
          .catch((err) => {
            this.logger.error(`Translation failed for key "${key}"`, err);
            return { key, translation: { en: value, ru: value, uz: value } };
          }),
      );

      const results = await Promise.all(promises);
      results.forEach(({ key, translation }) => {
        result[key] = translation;
      });
    }

    return result;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async generateText(prompt: string, retries = 3): Promise<string> {
    return this.queueRequest(async () => {
      try {
        const response = await this.ai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: prompt.length > 100 ? 500 : 300,
          temperature: 0.7,
        });

        const output = response.choices?.[0]?.message?.content ?? '';

        if (!output.trim()) {
          if (retries > 0) {
            this.logger.warn('OpenAI returned no text, retrying...');
            await this.delay(2000);
            return this.generateText(prompt, retries - 1);
          } else {
            throw new Error('OpenAI returned empty response after retries');
          }
        }

        return output.trim();
      } catch (err: any) {
        this.logger.error('generateText failed', err);

        // Retry on rate limit
        if (err?.status === 429 && retries > 0) {
          this.logger.warn('Rate limit hit, retrying...');
          await this.delay(3000);
          return this.generateText(prompt, retries - 1);
        }

        throw err;
      }
    });
  }
}
