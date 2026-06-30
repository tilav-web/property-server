import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PropertyView,
  PropertyViewSchema,
} from './schemas/property-view.schema';
import {
  Property,
  PropertySchema,
} from '../property/schemas/property.schema';
import { PropertyViewService } from './property-view.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyView.name, schema: PropertyViewSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  providers: [PropertyViewService],
  exports: [PropertyViewService],
})
export class PropertyViewModule {}
