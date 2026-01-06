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
import { Property, PropertySchema } from './schemas/property.schema';
import { EnumPropertyCategory } from './enums/property-category.enum';
import { Seller, SellerSchema } from '../seller/schemas/seller.schema'; // Import Seller and SellerSchema

import { GenaiModule } from '../openai/openai.module';
import { Tag, TagSchema } from './schemas/tag.schema';

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
        ],
      },
      { name: Like.name, schema: LikeSchema },
      { name: Save.name, schema: SaveSchema },
      { name: Seller.name, schema: SellerSchema }, // Add SellerSchema
      {
        name: Tag.name,
        schema: TagSchema,
      },
    ]),
    FileModule,
    MessageModule,
    GenaiModule,
  ],
  providers: [PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService],
})
export class PropertyModule {}
