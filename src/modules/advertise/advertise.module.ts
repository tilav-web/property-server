import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Advertise, AdvertiseSchema } from './advertise.schema';
import { AdvertiseController } from './advertise.controller';
import { AdvertiseService } from './advertise.service';
import { FileModule } from '../file/file.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advertise.name, schema: AdvertiseSchema },
    ]),
    FileModule,
    PaymentModule,
  ],
  controllers: [AdvertiseController],
  providers: [AdvertiseService],
  exports: [AdvertiseService],
})
export class AdvertiseModule {}
