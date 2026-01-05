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
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { Property } from '../property/schemas/property.schema';
import { User } from '../user/user.schema';

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

  async findAll({
    page = 1,
    limit = 10,
    search,
  }: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const skip = (page - 1) * limit;

    const match: Record<string, any> = { status: EnumSellerStatus.APPROVED };
    if (search) {
      match['user.first_name'] = { $regex: search, $options: 'i' };
    }

    const sellers = await this.sellerModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'properties',
          localField: 'user._id',
          foreignField: 'author',
          as: 'properties',
        },
      },
      {
        $addFields: {
          totalProperties: { $size: '$properties' },
          avgLikes: { $avg: '$properties.liked' },
          avgSaves: { $avg: '$properties.saved' },
        },
      },
      {
        $match: {
          ...match,
          totalProperties: { $gt: 0 },
        },
      },
      {
        $project: {
          properties: 0,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const total = await this.sellerModel.countDocuments({
      status: EnumSellerStatus.APPROVED,
    });
    const hasMore = page * limit < total;

    return {
      sellers,
      total,
      page,
      limit,
      hasMore,
    };
  }

  async findTop() {
    const sellers = await this.sellerModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'properties',
          localField: 'user._id',
          foreignField: 'author',
          as: 'properties',
        },
      },
      {
        $addFields: {
          totalProperties: { $size: '$properties' },
          avgLikes: { $avg: '$properties.liked' },
          avgSaves: { $avg: '$properties.saved' },
        },
      },
      {
        $match: {
          status: EnumSellerStatus.APPROVED,
          totalProperties: { $gt: 0 },
        },
      },
      {
        $sort: {
          totalProperties: -1,
        },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          properties: 0,
        },
      },
    ]);

    return sellers as SellerDocument[];
  }

  async findOne(id: string, language: EnumLanguage = EnumLanguage.UZ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid seller ID');
    }
    const [seller] = await this.sellerModel.aggregate<
      Seller & { user: User; properties: Property[] }
    >([
      {
        $match: {
          _id: new Types.ObjectId(id),
          status: EnumSellerStatus.APPROVED,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'properties',
          localField: 'user._id',
          foreignField: 'author',
          as: 'properties',
        },
      },
    ]);

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const properties = seller.properties.map((p) => ({
      ...p,
      title: p.title?.[language] ?? p.title?.uz ?? '',
      description: p.description?.[language] ?? p.description?.uz ?? '',
      address: p.address?.[language] ?? p.address?.uz ?? '',
    }));

    return { ...seller, properties };
  }

  async update(id: string, dto: UpdateSellerDto) {
    const seller = await this.sellerModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    return seller;
  }

  async findSellerByUser(id: string) {
    const user = await this.userService.findById(id);
    if (!user) throw new BadRequestException('User not found!');
    return this.sellerModel
      .findOne({ user: new Types.ObjectId(id) })
      .populate('ytt')
      .populate('mchj')
      .populate('bank_account')
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
    if (!seller) {
      throw new NotFoundException('Sotuvchi profili topilmadi');
    }

    if (!files?.passport_file?.[0]) {
      throw new BadRequestException('Pasport faylni yuborishingiz shart!');
    }

    if (!files?.ytt_certificate_file?.[0]) {
      throw new BadRequestException('YTT hujjatini yuborishingiz shart!');
    }

    if (dto.is_vat_payer === true && !files?.vat_file?.[0]) {
      throw new BadRequestException('QQS hujjatini yuborishingiz shart!');
    }

    const sellerId = new Types.ObjectId(dto.seller);

    const existingYttSeller = await this.yttSellerModel.findOne({
      seller: sellerId,
    });

    const updateData: Partial<YttSeller> = {
      seller: sellerId,
      company_name: dto.company_name,
      inn: dto.inn,
      pinfl: dto.pinfl,
      business_reg_number: dto.business_reg_number,
      business_reg_address: dto.business_reg_address,
      is_vat_payer: dto.is_vat_payer === true,
    };

    if (files.passport_file?.[0]) {
      const newPassportUrl = await this.fileService.saveFile({
        file: files.passport_file[0],
        folder: EnumFilesFolder.FILES,
      });

      if (existingYttSeller?.passport_file) {
        await this.fileService.deleteFile(existingYttSeller.passport_file);
      }

      updateData.passport_file = newPassportUrl;
    }

    if (files.ytt_certificate_file?.[0]) {
      const newYttCertUrl = await this.fileService.saveFile({
        file: files.ytt_certificate_file[0],
        folder: EnumFilesFolder.FILES,
      });

      if (existingYttSeller?.ytt_certificate_file) {
        await this.fileService.deleteFile(
          existingYttSeller.ytt_certificate_file,
        );
      }

      updateData.ytt_certificate_file = newYttCertUrl;
    }

    if (dto.is_vat_payer === true && files.vat_file?.[0]) {
      const newVatUrl = await this.fileService.saveFile({
        file: files.vat_file[0],
        folder: EnumFilesFolder.FILES,
      });

      if (existingYttSeller?.vat_file) {
        await this.fileService.deleteFile(existingYttSeller.vat_file);
      }

      updateData.vat_file = newVatUrl;
    }

    if (dto.is_vat_payer === false && existingYttSeller?.vat_file) {
      await this.fileService.deleteFile(existingYttSeller.vat_file);
      updateData.vat_file = undefined;
    }

    await this.yttSellerModel.findOneAndUpdate(
      { seller: sellerId },
      { $set: updateData },
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
    // Sotuvchi tekshiruvi
    const seller = await this.sellerModel.findById(dto.seller);
    if (!seller) throw new NotFoundException('Sotuvchi profili topilmadi');

    // Majburiy fayllar
    const requiredFiles: (keyof typeof files)[] = [
      'ustav_file',
      'mchj_license',
      'director_appointment_file',
      'director_passport_file',
      'legal_address_file',
      'kadastr_file',
    ];

    for (const field of requiredFiles) {
      if (!files[field]?.[0]) {
        throw new BadRequestException(`${field} faylni yuborishingiz shart!`);
      }
    }

    if (dto.is_vat_payer && !files.vat_file?.[0]) {
      throw new BadRequestException('QQS (VAT) hujjatini yuborishingiz shart!');
    }

    const sellerId = new Types.ObjectId(dto.seller);

    // Eski MCHJ ma’lumotini olish
    const existingMchjSeller = await this.mchjSellerModel.findOne({
      seller: sellerId,
    });

    // DTO → DB mapping
    const { seller: _, ...mchjDto } = dto;
    const updateData: Partial<Omit<MchjSeller, 'seller'>> = { ...mchjDto };

    // Fayllarni saqlash va eski fayllarni o‘chirish
    const fileFields: (keyof typeof files)[] = [...requiredFiles, 'vat_file'];

    for (const field of fileFields) {
      if (files[field]?.[0]) {
        // Eski faylni o'chirish
        if (existingMchjSeller?.[field]) {
          await this.fileService.deleteFile(existingMchjSeller[field]);
        }

        // Yangi faylni saqlash
        updateData[field] = await this.fileService.saveFile({
          file: files[field][0],
          folder: EnumFilesFolder.FILES,
        });
      }

      // Agar QQS to‘lovchi bo‘lmasa va eski fayl bo‘lsa, o'chirish
      if (
        field === 'vat_file' &&
        dto.is_vat_payer === false &&
        existingMchjSeller?.vat_file
      ) {
        await this.fileService.deleteFile(existingMchjSeller.vat_file);
        updateData.vat_file = undefined;
      }
    }

    // Ma’lumotni bazaga yozish
    await this.mchjSellerModel.findOneAndUpdate(
      { seller: sellerId },
      { $set: updateData, seller: sellerId },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Sotuvchi profilingini qaytarish
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
    // Sotuvchi yaratish yoki olish
    const { passport, ...selfEmployedDto } = dto;
    const { seller } = await this.createSeller({
      passport,
      user,
      business_type: EnumSellerBusinessType.SELF_EMPLOYED,
    });

    // Majburiy fayllar tekshiruvi
    const requiredFiles: (keyof typeof files)[] = [
      'passport_file',
      'self_employment_certificate',
    ];

    for (const field of requiredFiles) {
      if (!files[field]?.[0]) {
        throw new BadRequestException(`${field} faylni yuborishingiz shart!`);
      }
    }

    const sellerId = new Types.ObjectId(seller._id as string);

    // Eski Self-Employed ma’lumotini olish
    const existingSelfEmployed = await this.selfEmployedSellerModel.findOne({
      seller: sellerId,
    });

    // DTO → DB mapping
    const { birth_date, ...restDto } = selfEmployedDto;
    const updateData: Partial<Omit<SelfEmployedSeller, 'seller'>> = {
      ...restDto,
      birth_date: new Date(birth_date),
    };

    // Fayllarni saqlash va eski fayllarni o‘chirish
    for (const field of requiredFiles) {
      if (files[field]?.[0]) {
        if (existingSelfEmployed?.[field]) {
          await this.fileService.deleteFile(existingSelfEmployed[field]);
        }
        updateData[field] = await this.fileService.saveFile({
          file: files[field][0],
          folder: EnumFilesFolder.FILES,
        });
      }
    }

    // Ma’lumotni bazaga yozish
    await this.selfEmployedSellerModel.findOneAndUpdate(
      { seller: sellerId },
      { $set: updateData, seller: sellerId },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Sotuvchi statusini yangilash
    await this.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });

    // Sotuvchi profilingini qaytarish
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
    // Sotuvchi yaratish yoki olish
    const { passport, ...physicalDto } = dto;
    const { seller } = await this.createSeller({
      passport,
      user,
      business_type: EnumSellerBusinessType.PHYSICAL,
    });

    // Majburiy fayl tekshiruvi
    if (!files.passport_file?.[0]) {
      throw new BadRequestException('Pasport faylni yuborishingiz shart!');
    }

    const sellerId = new Types.ObjectId(seller._id as string);

    // Eski Physical ma’lumotini olish
    const existingPhysicalSeller = await this.physicalSellerModel.findOne({
      seller: sellerId,
    });

    // DTO → DB mapping
    const { birth_date, ...restDto } = physicalDto;
    const updateData: Partial<Omit<PhysicalSeller, 'seller'>> = {
      ...restDto,
      birth_date: new Date(birth_date),
    };

    // Faylni saqlash va eski faylni o‘chirish
    const fileField: keyof typeof files = 'passport_file';
    if (files[fileField]?.[0]) {
      if (existingPhysicalSeller?.[fileField]) {
        await this.fileService.deleteFile(existingPhysicalSeller[fileField]);
      }
      updateData[fileField] = await this.fileService.saveFile({
        file: files[fileField][0],
        folder: EnumFilesFolder.FILES,
      });
    }

    // Ma’lumotni bazaga yozish
    await this.physicalSellerModel.findOneAndUpdate(
      { seller: sellerId },
      { $set: updateData, seller: sellerId },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Sotuvchi statusini yangilash
    await this.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });

    // Sotuvchi profilingini qaytarish
    return this.sellerModel.findById(seller._id).populate('physical').lean();
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
