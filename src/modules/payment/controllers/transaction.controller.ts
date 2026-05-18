import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { OrderTypeEnum } from 'src/enums/order-type.enum';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transaction.schema';
import { TransactionService } from '../services/transaction.service';

@ApiTags('My Transactions')
@Controller('transactions')
export class TransactionController {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly transactionService: TransactionService,
  ) {}

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: "Mening to'lovlarim ro'yxati",
    description:
      "Foydalanuvchi o'z transactionlari (premium, advertise va h.k.) " +
      "holatini ko'radi. Filter: orderType, page, limit.",
  })
  @ApiStandardErrors({ auth: true })
  async listMine(
    @Req() req: IRequestCustom,
    @Query('orderType') orderType?: OrderTypeEnum,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const userId = req.user?._id as string;
    const page = Math.max(1, pageRaw ? Number(pageRaw) || 1 : 1);
    const limit = Math.min(100, Math.max(1, limitRaw ? Number(limitRaw) || 20 : 20));

    const filter: Record<string, unknown> = {
      user: new Types.ObjectId(userId),
    };
    if (orderType) filter.orderType = orderType;

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.transactionModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: "Transaction tafsilotlari (faqat egasi)",
  })
  @ApiStandardErrors({ auth: true, forbidden: true, notFound: true })
  async getOne(@Param('id') id: string, @Req() req: IRequestCustom) {
    const tx = await this.transactionService.findById(id);
    if (!tx) throw new NotFoundException('Transaction topilmadi');
    const userId = req.user?._id as string;
    if (tx.user.toString() !== userId.toString()) {
      throw new ForbiddenException("Ruxsat yo'q");
    }
    return tx;
  }
}
