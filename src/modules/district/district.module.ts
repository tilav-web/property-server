import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { District, DistrictSchema } from './district.schema';
import { DistrictController } from './district.controller';
import { DistrictService } from './district.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: District.name, schema: DistrictSchema },
    ]),
  ],
  controllers: [DistrictController],
  providers: [DistrictService],
})
export class DistrictModule {}
