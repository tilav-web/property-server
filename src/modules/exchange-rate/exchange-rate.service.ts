import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ExchangeRate,
  ExchangeRateDocument,
} from './exchange-rate.schema';
import { CurrencyCode } from 'src/common/currencies/currency.enum';
import { SUPPORTED_CURRENCIES } from 'src/common/currencies/currencies.constant';

interface UpdatePayload {
  rates?: Partial<Record<CurrencyCode, number>>;
  notes?: string;
}

@Injectable()
export class ExchangeRateService {
  constructor(
    @InjectModel(ExchangeRate.name)
    private readonly model: Model<ExchangeRateDocument>,
  ) {}

  /** Singleton — yo'q bo'lsa default qiymatlar bilan yaratadi. */
  async get(): Promise<ExchangeRateDocument> {
    let doc = await this.model.findOne();
    if (!doc) doc = await this.model.create({});
    return doc;
  }

  async update(payload: UpdatePayload, adminId: string) {
    const doc = await this.get();

    if (payload.rates) {
      for (const code of Object.keys(payload.rates) as CurrencyCode[]) {
        if (!SUPPORTED_CURRENCIES.includes(code)) {
          throw new BadRequestException(`Noto'g'ri valyuta kodi: ${code}`);
        }
        const value = payload.rates[code];
        if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
          throw new BadRequestException(
            `Kurs musbat raqam bo'lishi kerak: ${code}`,
          );
        }
        doc.rates[code] = value;
      }
      // base valyuta har doim 1 ga teng bo'lishi kerak
      doc.rates[doc.base] = 1;
      doc.markModified('rates');
    }

    if (payload.notes !== undefined) {
      doc.notes = payload.notes || undefined;
    }

    doc.updated_by = new Types.ObjectId(adminId);
    return doc.save();
  }
}
