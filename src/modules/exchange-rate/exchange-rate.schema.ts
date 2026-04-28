import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CurrencyCode } from 'src/common/currencies/currency.enum';

export type ExchangeRateDocument = ExchangeRate & Document;

/**
 * Singleton — DB'da bitta hujjat. Barcha kurslar `base` valyutasiga nisbatan
 * (1 USD = X). Konvertatsiya: amount * (rates[to] / rates[from]).
 */
@Schema({ timestamps: true, collection: 'exchange_rates' })
export class ExchangeRate {
  @Prop({
    type: String,
    enum: CurrencyCode,
    default: CurrencyCode.USD,
    required: true,
  })
  base: CurrencyCode;

  @Prop({
    type: Object,
    required: true,
    default: {
      [CurrencyCode.USD]: 1,
      [CurrencyCode.MYR]: 4.7,
      [CurrencyCode.UZS]: 12600,
      [CurrencyCode.IDR]: 16500,
      [CurrencyCode.SGD]: 1.34,
      [CurrencyCode.THB]: 36,
    },
  })
  rates: Record<CurrencyCode, number>;

  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  updated_by?: Types.ObjectId;

  @Prop({ type: String, required: false, maxlength: 500 })
  notes?: string;
}

export const ExchangeRateSchema = SchemaFactory.createForClass(ExchangeRate);
