import { Module } from '@nestjs/common';
import { StatisticController } from './statistic.controller';
import { StatisticService } from './statistic.service';
import { PropertyModule } from '../property/property.module';
import { InquiryModule } from '../inquiry/inquiry.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from '../property/schemas/property.schema';
import { Inquiry, InquirySchema } from '../inquiry/schemas/inquiry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Inquiry.name, schema: InquirySchema },
    ]),
    PropertyModule,
    InquiryModule,
  ],
  controllers: [StatisticController],
  providers: [StatisticService],
})
export class StatisticModule {}
