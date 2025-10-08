import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Seller, SellerDocument } from './schemas/seller.schema';
import { Model } from 'mongoose';
import { UserService } from '../user/user.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { YttSeller, YttSellerDocument } from './schemas/ytt-seller.schema';
import { MchjSeller, MchjSellerDocument } from './schemas/mchj-seller.schema';
import {
  SelfEmployedSeller,
  SelfEmployedSellerDocument,
} from './schemas/self-employed-seller.schema';
import { CreateYttSellerDto } from './dto/create-ytt-seller.dto';

@Injectable()
export class SellerService {
  constructor(
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
    @InjectModel(YttSeller.name)
    private yttSellerModel: Model<YttSellerDocument>,
    @InjectModel(MchjSeller.name)
    private mchjSellerModel: Model<MchjSellerDocument>,
    @InjectModel(SelfEmployedSeller.name)
    private selfEmployedSellerModel: Model<SelfEmployedSellerDocument>,
    private readonly userService: UserService,
  ) {}

  async createSeller({ passport, user, business_type }: CreateSellerDto) {
    const hasUser = await this.userService.findById(user);
    if (!hasUser) throw new BadRequestException('User not found!');

    const hasPassport = await this.sellerModel.findOne({ passport });
    if (hasPassport) {
      throw new BadRequestException('Passport already registered!');
    }

    return this.sellerModel.create({ user, passport, business_type });
  }

  async createYttSeller(
    dto: CreateYttSellerDto & {
      passport_file: Express.Multer.File;
      ytt_certificate_file: Express.Multer.File;
      vat_file?: Express.Multer.File;
    },
  ) {}
}
