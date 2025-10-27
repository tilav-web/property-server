import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Advertise, AdvertiseSchema } from './advertise.schema';
import { AdvertiseController } from './advertise.controller';
import { AdvertiseService } from './advertise.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advertise.name, schema: AdvertiseSchema },
    ]),
  ],
  controllers: [AdvertiseController],
  providers: [AdvertiseService],
})
export class AdvertiseModule {}
