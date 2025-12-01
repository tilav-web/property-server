import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Inquiry, InquirySchema } from './inquiry.schema';
import { InquiryController } from './inquiry.controller';
import { InquiryService } from './inquiry.service';
import { Property, PropertySchema } from '../property/schemas/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inquiry.name, schema: InquirySchema },
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  controllers: [InquiryController],
  providers: [InquiryService],
})
export class InquiryModule {}
