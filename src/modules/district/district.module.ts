import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { District, DistrictSchema } from './district.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: District.name, schema: DistrictSchema },
    ]),
  ],
  controllers: [],
  providers: [],
})
export class DistrictModule {}
