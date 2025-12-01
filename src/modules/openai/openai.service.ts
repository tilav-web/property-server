import { Injectable } from '@nestjs/common';
import { Language } from 'src/common/language/language.schema';

@Injectable()
export class OpenaiService {
  translateTexts(texts: Record<string, string>): Record<string, Language> {
    const translatedFields: Record<string, Language> = {};

    for (const key in texts) {
      if (Object.prototype.hasOwnProperty.call(texts, key)) {
        const value = texts[key];
        translatedFields[key] = {
          en: value,
          ru: value,
          uz: value,
        };
      }
    }

    return translatedFields;
  }
}
