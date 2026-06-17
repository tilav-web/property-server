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
import { LandSaleSchema } from './schemas/categories/land-sale.schema';
import { LandRentSchema } from './schemas/categories/land-rent.schema';
import { GarageSaleSchema } from './schemas/categories/garage-sale.schema';
import { GarageRentSchema } from './schemas/categories/garage-rent.schema';
import { HovliSaleSchema } from './schemas/categories/hovli-sale.schema';
import { HovliRentSchema } from './schemas/categories/hovli-rent.schema';
import { Property, PropertySchema } from './schemas/property.schema';
import { EnumPropertyCategory } from './enums/property-category.enum';
import { Seller, SellerSchema } from '../seller/schemas/seller.schema';

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
          { name: EnumPropertyCategory.APARTMENT_SALE, schema: ApartmentSaleSchema },
          { name: EnumPropertyCategory.APARTMENT_RENT, schema: ApartmentRentSchema },
          { name: EnumPropertyCategory.COMMERCIAL_RENT, schema: CommercialRentSchema },
          { name: EnumPropertyCategory.COMMERCIAL_SALE, schema: CommercialSaleSchema },
          { name: EnumPropertyCategory.LAND_SALE, schema: LandSaleSchema },
          { name: EnumPropertyCategory.LAND_RENT, schema: LandRentSchema },
          { name: EnumPropertyCategory.GARAGE_SALE, schema: GarageSaleSchema },
          { name: EnumPropertyCategory.GARAGE_RENT, schema: GarageRentSchema },
          { name: EnumPropertyCategory.HOVLI_SALE, schema: HovliSaleSchema },
          { name: EnumPropertyCategory.HOVLI_RENT, schema: HovliRentSchema },
        ],
      },
      { name: Like.name, schema: LikeSchema },
      { name: Save.name, schema: SaveSchema },
      { name: Seller.name, schema: SellerSchema },
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
