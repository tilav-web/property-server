import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { FileModule } from '../file/file.module';
import { Like, LikeSchema } from '../interactions/schemas/like.schema';
import { Save, SaveSchema } from '../interactions/schemas/save.schema';
import { MessageModule } from '../message/message.module';
import { ApartmentSaleSchema } from './schemas/categories/apartment-sale.schema';
import { ApartmentRentSchema } from './schemas/categories/apartment-rent.schema';
import { CommercialRentSchema } from './schemas/categories/commercial-rent.schema';
import { CommercialSaleSchema } from './schemas/categories/commercial-sale.schema';
import { Property, PropertySchema } from './schemas/property.schema';
import { EnumPropertyCategory } from './enums/property-category.enum';
import { Seller, SellerSchema } from '../seller/schemas/seller.schema'; // Import Seller and SellerSchema

import { GenaiModule } from '../openai/openai.module';
import { TagModule } from '../tag/tag.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Property.name,
        schema: PropertySchema,
        discriminators: [
          {
            name: EnumPropertyCategory.APARTMENT_SALE,
            schema: ApartmentSaleSchema,
          },
          {
            name: EnumPropertyCategory.APARTMENT_RENT,
            schema: ApartmentRentSchema,
          },
          {
            name: EnumPropertyCategory.COMMERCIAL_RENT,
            schema: CommercialRentSchema,
          },
          {
            name: EnumPropertyCategory.COMMERCIAL_SALE,
            schema: CommercialSaleSchema,
          },
        ],
      },
      { name: Like.name, schema: LikeSchema },
      { name: Save.name, schema: SaveSchema },
      { name: Seller.name, schema: SellerSchema }, // Add SellerSchema
    ]),
    FileModule,
    MessageModule,
    GenaiModule,
    TagModule,
    ExchangeRateModule,
  ],
  providers: [PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService],
})
export class PropertyModule {}
