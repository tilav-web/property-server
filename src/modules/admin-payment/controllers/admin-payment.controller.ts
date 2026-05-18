import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/modules/admin/guards/admin.guard';
import { type IAdminRequestCustom } from 'src/interfaces/admin-request.interface';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { PaymentApprovalService } from 'src/modules/payment/services/payment-approval.service';
import { TransactionService } from 'src/modules/payment/services/transaction.service';
import { ListPaymentsDto } from '../dto/list-payments.dto';
import { RejectPaymentDto } from '../dto/reject-payment.dto';

/**
 * Admin to'lovlarni boshqarish.
 *
 * Flow:
 *   1. User to'laydi
 *   2. Payme webhook -> Transaction SUCCESS + AWAITING
 *   3. Admin GET /admins/payments orqali ko'radi
 *   4. Admin approve qiladi -> orderType handler chaqiriladi
 *      (PROPERTY_PREMIUM -> Property.is_premium = true)
 *   5. Yoki reject qiladi -> sabab qoldiriladi (refund qo'lda)
 */
@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Payments')
@ApiStandardErrors({ auth: true, forbidden: true })
@Controller('admins/payments')
export class AdminPaymentController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly approvalService: PaymentApprovalService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Tasdiqlash kutilayotgan to'lovlar ro'yxati",
    description:
      "status=SUCCESS va adminApprovalStatus=AWAITING bo'lgan transaction'lar. " +
      "orderType bilan filterlash mumkin (ADVERTISE, PROPERTY_PREMIUM).",
  })
  @ApiStandardErrors({ auth: true, forbidden: true, validation: true })
  async list(@Query() dto: ListPaymentsDto) {
    return this.transactionService.listAwaiting(dto);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: "To'lovni tasdiqlash",
    description:
      "Admin to'lovni ko'rib chiqib tasdiqlasa, orderType'ga mos handler " +
      "chaqiriladi (masalan, Property.is_premium = true). Faqat keyin " +
      "Transaction.adminApprovalStatus = APPROVED bo'ladi.",
  })
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    notFound: true,
    conflict: true,
  })
  async approve(
    @Param('id') id: string,
    @Req() req: IAdminRequestCustom,
  ) {
    const adminId = req.admin?._id as string;
    return this.approvalService.approve(id, adminId);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: "To'lovni rad etish (refund qo'lda)",
    description:
      "Admin to'lovni rad etadi va sabab yozadi. Transaction " +
      "adminApprovalStatus = REJECTED bo'ladi. Refund Payme dashboard'idan " +
      "qo'lda qilinadi (avtomatik refund hozircha yo'q).",
  })
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    notFound: true,
    conflict: true,
    validation: true,
  })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @Req() req: IAdminRequestCustom,
  ) {
    const adminId = req.admin?._id as string;
    return this.approvalService.reject(id, adminId, dto.reason);
  }
}
