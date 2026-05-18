import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymeController } from './controllers/payme.controller';
import { PaymeService } from './services/payme.service';
import { TransactionService } from './services/transaction.service';
import {
  Transaction,
  TransactionSchema,
} from './schemas/transaction.schema';

/**
 * To'lov moduli.
 *
 * - Universal Transaction schema (orderType + orderId)
 * - Payme Merchant API webhook va RPC handlerlari
 * - TransactionService — boshqa modullar (advertise, property premium) shu
 *   service orqali transaction yaratadi va admin approval kuzatadi
 *
 * Keyingi bosqichlarda:
 * - Bosqich 2: PropertyPremiumModule — POST /properties/:id/upgrade-premium
 * - Bosqich 3: AdminPaymentController — pending payment list + approve/reject
 * - Bosqich 4: AdvertiseModule integratsiya — checkout-url endpoint
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [PaymeController],
  providers: [PaymeService, TransactionService],
  exports: [TransactionService],
})
export class PaymentModule {}
