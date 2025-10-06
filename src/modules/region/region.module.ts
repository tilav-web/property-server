import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Region, RegionSchema } from './region.schema';
import { RegionService } from './region.service';
import { RegionController } from './region.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Region.name, schema: RegionSchema }]),
  ],
  controllers: [RegionController],
  providers: [RegionService],
})
export class RegionModule {}
