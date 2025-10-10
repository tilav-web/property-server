import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankAccount, BankAccountSchema } from './bank-account.schema';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account.service';
import { UserModule } from '../user/user.module';
import { SellerModule } from '../seller/seller.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: BankAccount.name,
        schema: BankAccountSchema,
      },
    ]),
    UserModule,
    SellerModule,
  ],
  controllers: [BankAccountController],
  providers: [BankAccountService],
})
export class BankAccountModule {}
