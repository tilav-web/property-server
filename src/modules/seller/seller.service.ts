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
import { EnumSellerStatus } from 'src/enums/seller-status.enum';
import {
  PhysicalSeller,
  PhysicalSellerDocument,
} from './schemas/physical-seller.schema';
import { CreatePhysicalSellerDto } from './dto/create-physical-seller.dto';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';
import { Express } from 'express';

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
      .populate('ytt')
      .populate('mchj')
      .populate('self_employed')
      .populate('commissioner')
      .populate('bank_account')
      .populate('physical')
      .lean();
    return { user: hasUser, seller };
  }

  async findSellerByUser(id: string) {
    const user = await this.userService.findById(id);
    if (!user) throw new BadRequestException('User not found!');
    return this.sellerModel
      .findOne({ user: new Types.ObjectId(id) })
      .populate('ytt')
      .populate('mchj')
      .populate('self_employed')
      .populate('commissioner')
      .populate('physical')
      .lean();
  }

  async createYttSeller(
    dto: CreateYttSellerDto,
    files: {
      passport_file?: Express.Multer.File[];
      ytt_certificate_file?: Express.Multer.File[];
      vat_file?: Express.Multer.File[];
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

    const { seller: sellerId, ...yttDto } = dto;
    const yttUpdateData: Partial<Omit<YttSeller, 'seller'>> = { ...yttDto };

    const existingYttSeller = await this.yttSellerModel.findOne({
      seller: new Types.ObjectId(sellerId),
    });

    if (files.passport_file?.[0]) {
      if (existingYttSeller?.passport_file) {
        this.fileService.deleteFile(existingYttSeller.passport_file);
      }
      yttUpdateData.passport_file = this.fileService.saveFile({
        file: files.passport_file[0],
        folder: 'ytt-seller-files',
      });
    }

    if (files.ytt_certificate_file?.[0]) {
      if (existingYttSeller?.ytt_certificate_file) {
        this.fileService.deleteFile(existingYttSeller.ytt_certificate_file);
      }
      yttUpdateData.ytt_certificate_file = this.fileService.saveFile({
        file: files.ytt_certificate_file[0],
        folder: 'ytt-seller-files',
      });
    }

    if (dto.is_vat_payer && files.vat_file?.[0]) {
      if (existingYttSeller?.vat_file) {
        this.fileService.deleteFile(existingYttSeller.vat_file);
      }
      yttUpdateData.vat_file = this.fileService.saveFile({
        file: files.vat_file[0],
        folder: 'ytt-seller-files',
      });
    }

    await this.yttSellerModel.findOneAndUpdate(
      { seller: new Types.ObjectId(sellerId) },
      { $set: yttUpdateData, seller: new Types.ObjectId(sellerId) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return this.sellerModel
      .findById(sellerId)
      .populate('ytt')
      .populate('mchj')
      .populate('self_employed')
      .populate('physical')
      .lean();
  }

  async createMchjSeller(
    dto: CreateMchjSellerDto,
    files: {
      ustav_file?: Express.Multer.File[];
      mchj_license?: Express.Multer.File[];
      director_appointment_file?: Express.Multer.File[];
      director_passport_file?: Express.Multer.File[];
      legal_address_file?: Express.Multer.File[];
      kadastr_file?: Express.Multer.File[];
      vat_file?: Express.Multer.File[];
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

    const { seller: sellerId, ...mchjDto } = dto;
    const mchjUpdateData: Partial<Omit<MchjSeller, 'seller'>> = { ...mchjDto };

    const existingMchjSeller = await this.mchjSellerModel.findOne({
      seller: new Types.ObjectId(sellerId),
    });

    const fileFields: (keyof typeof files)[] = [
      'ustav_file',
      'mchj_license',
      'director_appointment_file',
      'director_passport_file',
      'legal_address_file',
      'kadastr_file',
      'vat_file',
    ];

    for (const field of fileFields) {
      if (files[field]?.[0]) {
        if (existingMchjSeller?.[field]) {
          this.fileService.deleteFile(existingMchjSeller[field]);
        }
        mchjUpdateData[field] = this.fileService.saveFile({
          file: files[field][0],
          folder: 'mchj-seller-files',
        });
      }
    }

    await this.mchjSellerModel.findOneAndUpdate(
      { seller: new Types.ObjectId(sellerId) },
      { $set: mchjUpdateData, seller: new Types.ObjectId(sellerId) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return this.sellerModel
      .findById(sellerId)
      .populate('ytt')
      .populate('mchj')
      .populate('self_employed')
      .populate('physical')
      .lean();
  }

  async createSelfEmployedSeller(
    dto: CreateSelfEmployedSellerDto,
    files: {
      passport_file?: Express.Multer.File[];
      self_employment_certificate?: Express.Multer.File[];
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

    const { birth_date, ...restDto } = selfEmployedDto;
    const selfEmployedUpdateData: Partial<Omit<SelfEmployedSeller, 'seller'>> =
      {
        ...restDto,
        birth_date: new Date(birth_date),
      };

    const existingSelfEmployed = await this.selfEmployedSellerModel.findOne({
      seller: new Types.ObjectId(seller._id as string),
    });

    if (files.passport_file?.[0]) {
      if (existingSelfEmployed?.passport_file) {
        this.fileService.deleteFile(existingSelfEmployed.passport_file);
      }
      selfEmployedUpdateData.passport_file = this.fileService.saveFile({
        file: files.passport_file[0],
        folder: 'self-employed-files',
      });
    }

    if (files.self_employment_certificate?.[0]) {
      if (existingSelfEmployed?.self_employment_certificate) {
        this.fileService.deleteFile(
          existingSelfEmployed.self_employment_certificate,
        );
      }
      selfEmployedUpdateData.self_employment_certificate =
        this.fileService.saveFile({
          file: files.self_employment_certificate[0],
          folder: 'self-employed-files',
        });
    }

    await this.selfEmployedSellerModel.findOneAndUpdate(
      { seller: new Types.ObjectId(seller._id as string) },
      {
        $set: selfEmployedUpdateData,
        seller: new Types.ObjectId(seller._id as string),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await this.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });

    return this.sellerModel
      .findById(seller._id)
      .populate('ytt')
      .populate('mchj')
      .populate('self_employed')
      .populate('physical')
      .lean();
  }

  async createPhysicalSeller(
    dto: CreatePhysicalSellerDto,
    files: {
      passport_file?: Express.Multer.File[];
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

    const { birth_date, ...restDto } = physicalDto;
    const physicalUpdateData: Partial<Omit<PhysicalSeller, 'seller'>> = {
      ...restDto,
      birth_date: new Date(birth_date),
    };

    const existingPhysicalSeller = await this.physicalSellerModel.findOne({
      seller: new Types.ObjectId(seller._id as string),
    });

    if (files.passport_file?.[0]) {
      if (existingPhysicalSeller?.passport_file) {
        this.fileService.deleteFile(existingPhysicalSeller.passport_file);
      }
      physicalUpdateData.passport_file = this.fileService.saveFile({
        file: files.passport_file[0],
        folder: 'physical-seller-files',
      });
    }

    await this.physicalSellerModel.findOneAndUpdate(
      { seller: new Types.ObjectId(seller._id as string) },
      {
        $set: physicalUpdateData,
        seller: new Types.ObjectId(seller._id as string),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await this.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });

    return this.sellerModel.findById(seller._id).populate('physical');
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
