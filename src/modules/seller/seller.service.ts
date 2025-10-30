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
import { EnumSellerStatus } from 'src/enums/seller-status.enum';
import {
  PhysicalSeller,
  PhysicalSellerDocument,
} from './schemas/physical-seller.schema';
import { CreatePhysicalSellerDto } from './dto/create-physical-seller.dto';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';

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
    @InjectModel(PhysicalSeller.name)
    private physicalSellerModel: Model<PhysicalSellerDocument>,
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
    const seller = await this.sellerModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(user) },
        { passport, business_type },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .populate({
        path: 'ytt',
        populate: [
          {
            path: 'passport_file',
          },
          {
            path: 'ytt_certificate_file',
          },
          {
            path: 'vat_file',
          },
        ],
      })
      .populate({
        path: 'mchj',
        populate: [
          {
            path: 'ustav_file',
          },
          {
            path: 'mchj_license',
          },
          {
            path: 'director_appointment_file',
          },
          {
            path: 'director_passport_file',
          },
          {
            path: 'legal_address_file',
          },
          {
            path: 'kadastr_file',
          },
          {
            path: 'vat_file',
          },
        ],
      })
      .populate({
        path: 'self_employed',
        populate: [
          {
            path: 'passport_file',
          },
          {
            path: 'self_employment_certificate',
          },
        ],
      })
      .populate({
        path: 'commissioner',
        populate: 'contract_file',
      })
      .populate('bank_account')
      .populate({
        path: 'physical',
        populate: [
          {
            path: 'passport_file',
          },
        ],
      })
      .lean();
    return { user: hasUser, seller };
  }

  async findSellerByUser(id: string) {
    const user = await this.userService.findById(id);
    if (!user) throw new BadRequestException('User not found!');
    return this.sellerModel
      .findOne({ user: id })
      .populate({
        path: 'ytt',
        populate: [
          {
            path: 'passport_file',
          },
          {
            path: 'ytt_certificate_file',
          },
          {
            path: 'vat_file',
          },
        ],
      })
      .populate({
        path: 'mchj',
        populate: [
          {
            path: 'ustav_file',
          },
          {
            path: 'mchj_license',
          },
          {
            path: 'director_appointment_file',
          },
          {
            path: 'director_passport_file',
          },
          {
            path: 'legal_address_file',
          },
          {
            path: 'kadastr_file',
          },
          {
            path: 'vat_file',
          },
        ],
      })
      .populate({
        path: 'self_employed',
        populate: [
          {
            path: 'passport_file',
          },
          {
            path: 'self_employment_certificate',
          },
        ],
      })
      .populate({
        path: 'commissioner',
        populate: 'contract_file',
      })
      .populate({
        path: 'physical',
        populate: [
          {
            path: 'passport_file',
          },
        ],
      })
      .lean();
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

    if (!files.passport_file)
      throw new BadRequestException('Pasport faylni yuborishingiz shart!');

    if (!files.ytt_certificate_file)
      throw new BadRequestException('YTT hujjatini  yuborishingiz shart!');

    if (dto.is_vat_payer && !files.vat_file)
      throw new BadRequestException('QQS hujjatini  yuborishingiz shart!');

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
    await this.fileService.uploadFiles(
      yttSeller._id as string,
      FileType.YTT_SELLER,
      files,
    );
    return this.sellerModel
      .findById(dto.seller)
      .populate({
        path: 'ytt',
        populate: [
          {
            path: 'passport_file',
          },
          {
            path: 'ytt_certificate_file',
          },
          {
            path: 'vat_file',
          },
        ],
      })
      .populate({
        path: 'mchj',
        populate: [
          {
            path: 'ustav_file',
          },
          {
            path: 'mchj_license',
          },
          {
            path: 'director_appointment_file',
          },
          {
            path: 'director_passport_file',
          },
          {
            path: 'legal_address_file',
          },
          {
            path: 'kadastr_file',
          },
          {
            path: 'vat_file',
          },
        ],
      })
      .populate({
        path: 'self_employed',
        populate: [
          {
            path: 'passport_file',
          },
          {
            path: 'self_employment_certificate',
          },
        ],
      })
      .populate({
        path: 'commissioner',
        populate: 'contract_file',
      })
      .populate({
        path: 'physical',
        populate: [
          {
            path: 'passport_file',
          },
        ],
      })
      .lean();
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

    if (!files.ustav_file)
      throw new BadRequestException('Ustav faylni yuborishingiz shart!');

    if (!files.mchj_license)
      throw new BadRequestException('Litsenziya faylni yuborishingiz shart!');

    if (!files.director_appointment_file)
      throw new BadRequestException(
        'Direktor tayinlanish hujjatini yuborishingiz shart!',
      );

    if (!files.director_passport_file)
      throw new BadRequestException(
        'Direktor pasport faylini yuborishingiz shart!',
      );

    if (!files.legal_address_file)
      throw new BadRequestException(
        'Yuridik manzil hujjatini yuborishingiz shart!',
      );

    if (!files.kadastr_file)
      throw new BadRequestException('Kadastr hujjatini yuborishingiz shart!');

    if (dto.is_vat_payer && !files.vat_file)
      throw new BadRequestException('QQS (VAT) hujjatini yuborishingiz shart!');

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

    await this.fileService.uploadFiles(
      mchjSeller._id as string,
      FileType.MCHJ_SELLER,
      files,
    );

    return this.sellerModel
      .findById(dto.seller)
      .populate({
        path: 'ytt',
        populate: [{ path: 'passport_file' }, { path: 'ytt_certificate_file' }],
      })
      .populate({
        path: 'mchj',
        populate: [
          { path: 'ustav_file' },
          { path: 'mchj_license' },
          { path: 'director_appointment_file' },
          { path: 'director_passport_file' },
          { path: 'legal_address_file' },
          { path: 'kadastr_file' },
        ],
      })
      .populate({
        path: 'self_employed',
        populate: [
          { path: 'passport_file' },
          { path: 'self_employment_certificate' },
        ],
      })
      .populate({
        path: 'physical',
        populate: [
          {
            path: 'passport_file',
          },
        ],
      })
      .lean();
  }

  async createSelfEmployedSeller(
    dto: CreateSelfEmployedSellerDto,
    files: {
      passport_file?: MulterFile[];
      self_employment_certificate?: MulterFile[];
    },
    user: string,
  ) {
    const { passport, ...selfEmployedDto } = dto;
    const { seller } = await this.createSeller({
      passport,
      user,
      business_type: EnumSellerBusinessType.SELF_EMPLOYED,
    });

    if (!files.passport_file)
      throw new BadRequestException('Pasport faylni yuborishingiz shart!');

    if (!files.self_employment_certificate)
      throw new BadRequestException(
        'O‘zini o‘zi bandlik sertifikatini yuborishingiz shart!',
      );
    const selfEmployedSeller =
      await this.selfEmployedSellerModel.findOneAndUpdate(
        { seller: new Types.ObjectId(seller._id as string) },
        {
          ...selfEmployedDto,
          seller: new Types.ObjectId(seller._id as string),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

    await this.fileService.deleteFilesByDocument(
      selfEmployedSeller._id as string,
      FileType.SELF_EMPLOYED_SELLER,
    );

    await this.fileService.uploadFiles(
      selfEmployedSeller._id as string,
      FileType.SELF_EMPLOYED_SELLER,
      files,
    );

    await this.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });

    return this.sellerModel
      .findById(seller._id)
      .populate({
        path: 'ytt',
        populate: [{ path: 'passport_file' }, { path: 'ytt_certificate_file' }],
      })
      .populate({
        path: 'mchj',
        populate: [
          { path: 'ustav_file' },
          { path: 'mchj_license' },
          { path: 'director_appointment_file' },
          { path: 'director_passport_file' },
          { path: 'legal_address_file' },
          { path: 'kadastr_file' },
        ],
      })
      .populate({
        path: 'self_employed',
        populate: [
          { path: 'passport_file' },
          { path: 'self_employment_certificate' },
        ],
      })
      .populate({
        path: 'physical',
        populate: [
          {
            path: 'passport_file',
          },
        ],
      })
      .lean();
  }

  async createPhysicalSeller(
    dto: CreatePhysicalSellerDto,
    files: {
      passport_file?: MulterFile[];
    },
    user: string,
  ) {
    const { passport, ...physicalDto } = dto;
    const { seller } = await this.createSeller({
      passport,
      user,
      business_type: EnumSellerBusinessType.PHYSICAL,
    });

    if (!files.passport_file)
      throw new BadRequestException('Pasport faylni yuborishingiz shart!');

    const physicalSeller = await this.physicalSellerModel.findOneAndUpdate(
      { seller: new Types.ObjectId(seller._id as string) },
      {
        ...physicalDto,
        seller: new Types.ObjectId(seller._id as string),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await this.fileService.deleteFilesByDocument(
      physicalSeller._id as string,
      FileType.PHYSICAL_SELLER,
    );

    await this.fileService.uploadFiles(
      physicalSeller._id as string,
      FileType.PHYSICAL_SELLER,
      files,
    );

    await this.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });

    return this.sellerModel.findById(seller._id).populate({
      path: 'physical',
      populate: [
        {
          path: 'passport_file',
        },
      ],
    });
  }

  async updateSellerStatus({
    id,
    status,
  }: {
    id: string;
    status: EnumSellerStatus;
  }) {
    return this.sellerModel.findByIdAndUpdate(id, {
      status,
    });
  }
}
