import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BankAccount, BankAccountDocument } from './bank-account.schema';
import { Model } from 'mongoose';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UserService } from '../user/user.service';
import { SellerService } from '../seller/seller.service';

@Injectable()
export class BankAccountService {
  constructor(
    @InjectModel(BankAccount.name) private model: Model<BankAccountDocument>,
    private readonly userService: UserService,
    private readonly sellerService: SellerService,
  ) {}

  async findById(id: string) {
    return this.model.findById(id);
  }

  async findBySellerId(seller: string) {
    return this.model.findOne({ seller });
  }

  async create(dto: CreateBankAccountDto & { user: string }) {
    // 1️⃣ Foydalanuvchini tekshirish
    const user = await this.userService.findById(dto.user);
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi!');
    }

    // 2️⃣ Sotuvchini tekshirish
    const seller = await this.sellerService.findSellerByUser(dto.user);
    if (!seller) {
      throw new BadRequestException('Sotuvchi profili topilmadi!');
    }

    // 3️⃣ Bank accountni create yoki update qilish (upsert)
    const bank_account = await this.model.findOneAndUpdate(
      { seller: seller._id },
      {
        account_number: dto.account_number,
        bank_name: dto.bank_name,
        mfo: dto.mfo,
        owner_full_name: dto.owner_full_name,
        swift_code: dto.swift_code,
        seller: seller._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // 4️⃣ Natija
    return {
      ...seller,
      bank_account,
    };
  }
}
