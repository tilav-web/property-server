import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Language } from 'src/common/language/language.schema';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GenaiService {
  private readonly model;
  private readonly logger = new Logger(GenaiService.name);

  constructor() {
    const genAI = new GoogleGenAI({});

    // 🔥 Gemini Pro modeli
    this.model = async (contents: string | string[]): Promise<string> => {
      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
        });

        // AI javobi matni
        return (response.text || '').toString(); // to string type
      } catch (error) {
        this.logger.error(`Model generateContent error: ${error}`);
        throw new InternalServerErrorException(
          'Failed to generate content via AI.',
        );
      }
    };
  }

  /**
   * 🔄 Matnni ma'lum bir tilga tarjima qilish
   */
  private async translate(
    text: string,
    lang: 'English' | 'Russian' | 'Uzbek',
  ): Promise<string> {
    try {
      // Faqat **bir jumla yoki oddiy matn** olish uchun prompt
      const prompt = `Translate this text to ${lang} in one simple sentence, without examples or multiple options: ${text}`;
      const aiResponse = (await this.model(prompt)) as string;

      // Matnni tozalash: \n, *, - va ortiqcha bo‘sh joylarni olib tashlash
      const translatedText = aiResponse
        .replace(/[*\-]/g, '') // * yoki - belgilarini olib tashlash
        .replace(/\n+/g, ' ') // yangi qatordan bo‘sh joyga aylantirish
        .trim();

      // Agar tarjima bo‘lmasa, original matnni qaytarish
      return translatedText || text;
    } catch (error) {
      this.logger.error(`Translation error (${lang}): ${error}`);
      throw new InternalServerErrorException(
        `Failed to translate to ${lang} via generative AI.`,
      );
    }
  }

  async translateTexts(
    texts: Record<string, string>,
  ): Promise<Record<string, Language>> {
    const translatedFields: Record<string, Language> = {};

    for (const key in texts) {
      if (Object.prototype.hasOwnProperty.call(texts, key) && texts[key]) {
        const original = texts[key];

        // 🟦 Parallel tarjima — tezroq ishlaydi
        const [en, ru, uz] = await Promise.all([
          this.translate(original, 'English'),
          this.translate(original, 'Russian'),
          this.translate(original, 'Uzbek'),
        ]);

        translatedFields[key] = { en, ru, uz };
      }
    }

    return translatedFields;
  }

  /**
   * 🤖 Matn yaratish uchun ochiq metod (AiPropertyService tomonidan ishlatiladi)
   */
  public async generateText(prompt: string) {
    const response = (await this.model(prompt)) as string;
    return response;
  }
}
