import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  Seller,
  SellerDocument,
} from 'src/modules/seller/schemas/seller.schema';
import { User, UserDocument } from 'src/modules/user/user.schema';
import { FindSellersDto } from '../dto/find-sellers.dto';
import { UpdateSellerDto } from '../dto/update-seller.dto';

@Injectable()
export class AdminSellerService {
  constructor(
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(dto: FindSellersDto) {
    const { page = 1, limit = 10, search, status, business_type } = dto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<SellerDocument> = {};

    if (status) {
      filter.status = status;
    }

    if (business_type) {
      filter.business_type = business_type;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const users = await this.userModel
        .find({
          $or: [
            { first_name: searchRegex },
            { last_name: searchRegex },
            { 'email.value': searchRegex },
            { 'phone.value': searchRegex },
          ],
        })
        .select('_id');

      const userIds = users.map((u) => u._id);
      filter.user = { $in: userIds };
    }

    const sellers = await this.sellerModel
      .find(filter)
      .populate('user', 'first_name last_name email phone avatar')
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.sellerModel.countDocuments(filter);
    const hasMore = page * limit < total;

    return {
      sellers,
      total,
      page,
      limit,
      hasMore,
    };
  }

  async findOne(id: string) {
    const seller = await this.sellerModel
      .findById(id)
      .populate('user')
      .populate('ytt')
      .populate('mchj')
      .populate('self_employed')
      .populate('physical')
      .populate('bank_account')
      .populate('commissioner')
      .lean();

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    return seller;
  }

  async update(sellerId: string, dto: UpdateSellerDto) {
    const seller = await this.sellerModel.findById(sellerId);

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    seller.status = dto.status;
    return seller.save();
  }
}
