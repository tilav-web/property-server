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
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { CreateMchjSellerDto } from './dto/create-mchj-seller.dto';
import { CreateSelfEmployedSellerDto } from './dto/self-employed-seller.dto';

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

  async createSeller({
    passport,
    user,
    business_type,
    first_name,
    last_name,
    phone,
    lan,
  }: CreateSellerDto & UpdateUserDto) {
    const hasUser = await this.userService.findById(user);
    if (!hasUser) throw new BadRequestException('User not found!');

    const conflict = await this.sellerModel.findOne({
      passport,
      user: { $ne: user },
    });

    if (conflict) {
      throw new BadRequestException(
        'This passport already belongs to another user!',
      );
    }

    if (first_name) hasUser.first_name = first_name;
    if (last_name) hasUser.last_name = last_name;
    if (phone) hasUser.phone.value = phone;
    if (lan) hasUser.lan = lan;

    await hasUser.save();
    const seller = await this.sellerModel.findOneAndUpdate(
      { user },
      { passport, business_type },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return { user: hasUser, seller };
  }

  async findSellerByUser(id: string) {
    const user = await this.userService.findById(id);
    if (!user) throw new BadRequestException('User not found!');
    return this.sellerModel.findOne({ user: id });
  }

  async createYttSeller(
    dto: CreateYttSellerDto & {
      passport_file: Express.Multer.File;
      ytt_certificate_file: Express.Multer.File;
      vat_file?: Express.Multer.File;
    },
  ) {}

  async createMchjSeller(
    dto: CreateMchjSellerDto & {
      ustav_file: Express.Multer.File;
      mchj_license: Express.Multer.File;
      director_appointment_file?: Express.Multer.File;
      director_passport_file?: Express.Multer.File;
      legal_address_file?: Express.Multer.File;
      kadastr_file?: Express.Multer.File;
      vat_file?: Express.Multer.File;
    },
  ) {}

  async createSelfEmployedSeller(
    dto: CreateSelfEmployedSellerDto & {
      passport_file: Express.Multer.File;
      self_employment_certificate: Express.Multer.File;
      vat_file?: Express.Multer.File;
    },
  ) {}
}
