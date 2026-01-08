import {
  InquiryResponse,
  InquiryResponseSchema,
} from './schemas/inquiry-response.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Inquiry, InquirySchema } from './schemas/inquiry.schema';
import { Property, PropertySchema } from '../property/schemas/property.schema';
import { InquiryController } from './controllers/inquiry.controller';
import { InquiryService } from './services/inquiry.service';
import { InquiryResponseController } from './controllers/inquiry-response.controller';
import { InquiryResponseService } from './services/inquiry-response.service';
import { Seller, SellerSchema } from 'src/modules/seller/schemas/seller.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inquiry.name, schema: InquirySchema },
      { name: Property.name, schema: PropertySchema },
      { name: InquiryResponse.name, schema: InquiryResponseSchema },
      { name: Seller.name, schema: SellerSchema },
    ]),
  ],
  controllers: [InquiryController, InquiryResponseController],
  providers: [InquiryService, InquiryResponseService],
})
export class InquiryModule {}
