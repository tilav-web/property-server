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
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';

import { FileModule } from '../file/file.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Seller.name, schema: SellerSchema },
      { name: YttSeller.name, schema: YttSellerSchema },
      { name: MchjSeller.name, schema: MchjSellerSchema },
      { name: SelfEmployedSeller.name, schema: SelfEmployedSellerSchema },
    ]),
    UserModule,
    FileModule,
  ],
  controllers: [SellerController],
  providers: [SellerService],
  exports: [SellerService],
})
export class SellerModule {}
