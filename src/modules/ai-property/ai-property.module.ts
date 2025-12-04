import { Module } from '@nestjs/common';
import { AiPropertyService } from './ai-property.service';
import { AiPropertyController } from './ai-property.controller';
import { GenaiModule } from '../genai/genai.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from '../property/schemas/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
    ]),
    GenaiModule,
  ],
  providers: [AiPropertyService],
  controllers: [AiPropertyController],
  exports: [AiPropertyService],
})
export class AiPropertyModule {}
