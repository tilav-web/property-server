import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { District, DistrictSchema } from './district.schema';
import { DistrictController } from './district.controller';
import { DistrictService } from './district.service';
import { RegionModule } from '../region/region.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: District.name, schema: DistrictSchema },
    ]),
    RegionModule,
  ],
  controllers: [DistrictController],
  providers: [DistrictService],
})
export class DistrictModule {}
