import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PaymentModule } from '../payment/payment.module';
import { AdminPaymentController } from './controllers/admin-payment.controller';

@Module({
  imports: [PaymentModule, AdminModule],
  controllers: [AdminPaymentController],
})
export class AdminPaymentModule {}
