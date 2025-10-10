import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Commissioner, CommissionerSchema } from './commissioner.schema';
import { CommissionerController } from './commissioner.controller';
import { CommissionerService } from './commissioner.service';
import { UserModule } from '../user/user.module';
import { SellerModule } from '../seller/seller.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commissioner.name, schema: CommissionerSchema },
    ]),
    UserModule,
    SellerModule,
    FileModule,
  ],
  controllers: [CommissionerController],
  providers: [CommissionerService],
})
export class CommissionerModule {}
