import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Seller, SellerSchema } from './schemas/seller.schema';
import { YttSeller, YttSellerSchema } from './schemas/ytt-seller.schema';
import { MchjSeller, MchjSellerSchema } from './schemas/mchj-seller.schema';
import {
  SelfEmployedSeller,
  SelfEmployedSellerSchema,
} from './schemas/self-employed-seller.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Seller.name, schema: SellerSchema },
      { name: YttSeller.name, schema: YttSellerSchema },
      { name: MchjSeller.name, schema: MchjSellerSchema },
      { name: SelfEmployedSeller.name, schema: SelfEmployedSellerSchema },
    ]),
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class SellerModule {}
