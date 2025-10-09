import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Seller, SellerDocument } from './schemas/seller.schema';
import { Model, Types } from 'mongoose';
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
import { FileService } from '../file/file.service';
import { FileType } from '../file/file.schema';
import { MulterFile } from 'src/interfaces/multer-file.interface';

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
    private readonly fileService: FileService,
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
    dto: CreateYttSellerDto,
    files: {
      passport_file?: MulterFile[];
      ytt_certificate_file?: MulterFile[];
      vat_file?: MulterFile[];
    },
  ) {
    const seller = await this.sellerModel.findById(dto.seller);
    if (!seller) throw new NotFoundException('Sotuvchi profili topilmadi');

    // Use findOneAndUpdate with upsert to create or update the YttSeller document
    const yttSeller = await this.yttSellerModel.findOneAndUpdate(
      { seller: new Types.ObjectId(dto.seller) },
      {
        ...dto,
        seller: new Types.ObjectId(dto.seller),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Delete old files associated with this YTT seller
    await this.fileService.deleteFilesByDocument(
      yttSeller._id as string,
      FileType.YTT_SELLER,
    );

    // Upload the new files
    await this.fileService.uploadSellerFiles(
      yttSeller._id as string,
      FileType.YTT_SELLER,
      files,
    );

    return yttSeller;
  }

  async createMchjSeller(
    dto: CreateMchjSellerDto,
    files: {
      ustav_file?: MulterFile[];
      mchj_license?: MulterFile[];
      director_appointment_file?: MulterFile[];
      director_passport_file?: MulterFile[];
      legal_address_file?: MulterFile[];
      kadastr_file?: MulterFile[];
      vat_file?: MulterFile[];
    },
  ) {
    const seller = await this.sellerModel.findById(dto.seller);
    if (!seller) throw new NotFoundException('Sotuvchi profili topilmadi');

    const mchjSeller = await this.mchjSellerModel.findOneAndUpdate(
      { seller: new Types.ObjectId(dto.seller) },
      {
        ...dto,
        seller: new Types.ObjectId(dto.seller),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await this.fileService.deleteFilesByDocument(
      mchjSeller._id as string,
      FileType.MCHJ_SELLER,
    );

    await this.fileService.uploadSellerFiles(
      mchjSeller._id as string,
      FileType.MCHJ_SELLER,
      files,
    );

    return mchjSeller;
  }

  async createSelfEmployedSeller(
    dto: CreateSelfEmployedSellerDto,
    files: {
      passport_file?: MulterFile[];
      self_employment_certificate?: MulterFile[];
      vat_file?: MulterFile[];
    },
  ) {
    const seller = await this.sellerModel.findById(dto.seller);
    if (!seller) throw new NotFoundException('Sotuvchi profili topilmadi');

    const selfEmployedSeller =
      await this.selfEmployedSellerModel.findOneAndUpdate(
        { seller: new Types.ObjectId(dto.seller) },
        {
          ...dto,
          seller: new Types.ObjectId(dto.seller),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

    await this.fileService.deleteFilesByDocument(
      selfEmployedSeller._id as string,
      FileType.SELF_EMPLOYED_SELLER,
    );

    await this.fileService.uploadSellerFiles(
      selfEmployedSeller._id as string,
      FileType.SELF_EMPLOYED_SELLER,
      files,
    );

    return selfEmployedSeller;
  }
}
