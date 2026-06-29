import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

// gpt-4o-mini-transcribe qabul qiladigan til kodlari.
// uz (o'zbek) ro'yxatda yo'q — API 400 qaytaradi. Buning o'rniga
// WHISPER_LANGUAGE_PROMPTS orqali prompt biasing ishlatiladi.
const WHISPER_SUPPORTED_LANGUAGES = new Set([
  'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr', 'cs', 'da',
  'nl', 'en', 'et', 'fi', 'fr', 'gl', 'de', 'el', 'he', 'hi', 'hu', 'is',
  'id', 'it', 'ja', 'kn', 'kk', 'ko', 'lv', 'lt', 'mk', 'ms', 'mr', 'mi',
  'ne', 'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw',
  'sv', 'tl', 'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'cy',
]);

// Whisper auto-detect uz/ms/kk uchun zaif (Pashto/Urdu/Tatar bilan adashadi).
// Prompt parametri orqali modelni shu tildagi nutq bo'lishi bo'yicha biasing
// beramiz — Whisper transkripsiyasini o'sha tildagi so'zlar bilan boshlaydi.
// Prompt aslida transcribe qilinmaydi, faqat dekoderning til-uslub priorini
// belgilaydi.
const WHISPER_LANGUAGE_PROMPTS: Record<string, string | undefined> = {
  uz: "Salom. Bu o'zbek tilidagi nutq. Mulk, kvartira, ijara, sotib olish, narx, xonalar, shahar.",
  ms: 'Hello. This is Malay language speech. Property, apartment, rent, buy, price, bedrooms, city.',
  kk: 'Сәлем. Бұл қазақ тіліндегі сөйлеу. Мүлік, пәтер, жалға, сатып алу, баға.',
};

interface TranslationResponse {
  en?: string;
  ru?: string;
  uz?: string;
  ms?: string;
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
      (typeof translation.uz === 'string' || translation.uz === undefined) &&
      (typeof translation.ms === 'string' || translation.ms === undefined)
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

  // priority=true — real-time voice calllar uchun: queue kutishini o'tkazib yuboradi.
  // Batch calllar (translateTexts va h.k.) priority=false (default) ishlatadi.
  private async queueRequest<T>(fn: () => Promise<T>, priority = false): Promise<T> {
    if (priority) return fn();

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
1. Translations for each field in English (en), Russian (ru), Uzbek (uz), and Malay (ms).
2. Relevant search tags/keywords based on location.

Input:
${textsJson}

Return ONLY valid JSON in this exact format:
{
  "translations": {
    "title": {
      "en": "English translation",
      "ru": "Russian translation",
      "uz": "Uzbek translation",
      "ms": "Malay translation"
    },
    "description": {
      "en": "English translation",
      "ru": "Russian translation",
      "uz": "Uzbek translation",
      "ms": "Malay translation"
    },
    "address": {
      "en": "English translation",
      "ru": "Russian translation",
      "uz": "Uzbek translation",
      "ms": "Malay translation"
    }
  },
  "tags": [
    "Malaysia",
    "Малайзия",
    "Malayziya",
    "Malaysia",
    "Selangor",
    "Penang",
    "Johor"
  ]
}

**Rules for translations:**
- All four languages (en, ru, uz, ms) MUST be provided for every field.
- Malay (ms) is the local language of Malaysia — use proper Malay, not a transliteration.
- If the original is already in one of the languages, keep that variant intact and translate the others.

**Rules for tags:**
- **CRITICAL:** Tags MUST only contain a SINGLE word.
- **CRITICAL:** Tags MUST be for a notable location (city, region, country).
- **CRITICAL:** For each location, provide the name in English, Russian, Uzbek, and Malay when they differ.
- **ABSOLUTELY NO** multi-word tags like "Kuala Lumpur city". Use a single-word location such as "Selangor" instead.
- **DO NOT** include any tags that are not locations, such as "3 bedroom", "luxury", or "apartment".
- Generate 5-12 location tags in total.

Examples of correct tags:
- "Malaysia", "Малайзия", "Malayziya"
- "Selangor", "Селангор"
- "Dubai", "Дубай"

Examples of INCORRECT tags:
- "Kuala Lumpur city"
- "3 bedroom"
- "newly built"`;

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
            const en = (translation.en ?? texts[key]).trim();
            // ms yetishmasa — inglizchaga fallback qilamiz
            translations[key] = {
              en,
              ru: (translation.ru ?? texts[key]).trim(),
              uz: (translation.uz ?? texts[key]).trim(),
              ms: (translation.ms ?? en).trim(),
            };
          } else {
            translations[key] = {
              en: texts[key],
              ru: texts[key],
              uz: texts[key],
              ms: texts[key],
            };
          }
        }

        // Clean tags - remove duplicates and empty strings, and ensure single word
        const tags = Array.from(
          new Set(
            parsed.tags
              .filter(
                (tag): tag is string =>
                  typeof tag === 'string' &&
                  tag.trim().length > 0 &&
                  !tag.includes(' '), // New condition: ensure no spaces
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
        ms: texts[key],
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

  async generateJson<T = unknown>(opts: {
    system: string;
    user: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    /** Real-time calllar uchun: queue 450ms kutishini o'tkazib yuboradi */
    priority?: boolean;
  }): Promise<{ data: T; usage?: OpenAI.CompletionUsage }> {
    const {
      system,
      user,
      model = 'gpt-4o-mini',
      temperature = 0.1,
      maxTokens = 800,
      priority = false,
    } = opts;

    return this.queueRequest(() =>
      this.withRetry(async () => {
        const response = await this.ai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          max_tokens: maxTokens,
          temperature,
        });

        const output = response.choices?.[0]?.message?.content?.trim() ?? '';
        if (!output) {
          throw new Error('OpenAI returned empty response');
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(output);
        } catch {
          throw new Error('OpenAI returned non-JSON response');
        }

        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('OpenAI returned a non-object JSON value');
        }

        return { data: parsed as T, usage: response.usage };
      }, 3),
      priority,
    );
  }

  async transcribeAudio(opts: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
    language?: string;
    /**
     * Override model. Default: gpt-4o-mini-transcribe (whisper-1 dan 2x arzon
     * va aniqroq, uz/kk kabi tillarni ham qo'llab-quvvatlaydi).
     */
    model?: 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe' | 'whisper-1';
    /** Real-time calllar uchun: queue 450ms kutishini o'tkazib yuboradi */
    priority?: boolean;
  }): Promise<string> {
    const { buffer, filename, mimeType, language, priority = false } = opts;
    const model = opts.model ?? 'gpt-4o-mini-transcribe';

    return this.queueRequest(() =>
      this.withRetry(async () => {
        const file = await toFile(buffer, filename, { type: mimeType });
        const safeLanguage = WHISPER_SUPPORTED_LANGUAGES.has(language ?? '')
          ? language
          : undefined;
        const prompt = WHISPER_LANGUAGE_PROMPTS[language ?? ''];
        const response = await this.ai.audio.transcriptions.create({
          file,
          model,
          language: safeLanguage,
          prompt,
          response_format: 'json',
        });
        const text = (response.text ?? '').trim();
        if (!text) {
          throw new Error('Transcription returned empty result');
        }
        return text;
      }, 2),
      priority,
    );
  }

  async generateSpeech(opts: {
    text: string;
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
    model?: 'tts-1' | 'tts-1-hd';
    /** Real-time calllar uchun: queue 450ms kutishini o'tkazib yuboradi */
    priority?: boolean;
  }): Promise<Buffer> {
    const {
      text,
      voice = 'nova',
      format = 'mp3',
      model = 'tts-1',
      priority = false,
    } = opts;

    const safe = text.slice(0, 4000);

    return this.queueRequest(() =>
      this.withRetry(async () => {
        const response = await this.ai.audio.speech.create({
          model,
          voice,
          input: safe,
          response_format: format,
        });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }, 2),
      priority,
    );
  }
}
