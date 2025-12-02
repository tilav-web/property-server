import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Property, PropertyDocument } from './schemas/property.schema';
import { FilterQuery, Model } from 'mongoose';
import { FileService } from '../file/file.service';
import { OpenaiService } from '../openai/openai.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { EnumPropertyCategory } from './enums/property-category.enum';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_RENT)
    private readonly apartmentRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_SALE)
    private readonly apartmentSaleModel: Model<PropertyDocument>,
    private readonly fileService: FileService,
    private readonly openaiService: OpenaiService,
  ) {}

  async create({
    dto,
    files,
    author,
  }: {
    dto: CreatePropertyDto;
    files: {
      photos?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    };
    author?: string;
  }) {
    const { category } = dto;

    if (!category) {
      throw new BadRequestException('Category talabi majburiy!');
    }
    if (!author) {
      throw new BadRequestException('Log back in system!');
    }

    // Fayllarni saqlash
    const photos = files?.photos?.length
      ? this.fileService.saveFiles({
          files: files.photos,
          folder: EnumFilesFolder.PHOTOS,
        })
      : [];

    const videos = files?.videos?.length
      ? this.fileService.saveFiles({
          files: files.videos,
          folder: EnumFilesFolder.VIDEOS,
        })
      : [];

    let Model: Model<PropertyDocument>;

    switch (category) {
      case EnumPropertyCategory.APARTMENT_RENT:
        Model = this.apartmentRentModel;
        break;
      case EnumPropertyCategory.APARTMENT_SALE:
        Model = this.apartmentSaleModel;
        break;
      default:
        throw new BadRequestException("Qo'llab-quvvatlanmaydigan kategoriya");
    }

    const location = {
      type: 'Point',
      coordinates: [dto.location_lng, dto.location_lat],
    };

    const language = this.openaiService.translateTexts({
      title: dto.title,
      description: dto.description,
      address: dto.address,
    });

    const property = await Model.create({
      ...dto,
      photos,
      videos,
      author,
      location,
      title: language.title,
      description: language.description,
      address: language.address,
    });

    return property;
  }

  private getProjectionByCategory(language: EnumLanguage, category?: string) {
    // Base projection (barcha category uchun umumiy fieldlar)
    const baseProjection = {
      // Til fieldlari
      title: { $ifNull: [`$title.${language}`, '$title.uz'] },
      description: { $ifNull: [`$description.${language}`, '$description.uz'] },
      address: { $ifNull: [`$address.${language}`, '$address.uz'] },

      // Umumiy fieldlar
      _id: 1,
      category: 1,
      is_premium: 1,
      is_verified: 1,
      is_new: 1,
      rating: 1,
      images: 1,
      coordinates: 1,
      createdAt: 1,
      updatedAt: 1,
      distance: 1, // $geoNear dan keladi
      owner: 1,
      views: 1,
    };

    // Agar category ko'rsatilmagan bo'lsa, faqat base fieldlarni qaytarish
    if (!category) return baseProjection;

    // Category-specific fieldlar
    const categoryFields: Record<string, any> = {
      // 🏢 APARTMENT_RENT - Kvartira Ijarasi
      APARTMENT_RENT: {
        price: 1,
        bedrooms: 1,
        bathrooms: 1,
        floor_level: 1,
        total_floors: 1,
        area: 1,
        balcony: 1,
        furnished: 1,
        repair_type: 1,
        heating: 1,
        air_conditioning: 1,
        parking: 1,
        elevator: 1,
        amenities: 1,
        contract_duration_months: 1, // Faqat RENT uchun
      },

      // 🏢 APARTMENT_SALE - Kvartira Sotish
      APARTMENT_SALE: {
        price: 1,
        bedrooms: 1,
        bathrooms: 1,
        floor_level: 1,
        total_floors: 1,
        area: 1,
        balcony: 1,
        furnished: 1,
        repair_type: 1,
        heating: 1,
        air_conditioning: 1,
        parking: 1,
        elevator: 1,
        amenities: 1,
        mortgage_available: 1, // Faqat SALE uchun
      },
    };

    // Base + category-specific fieldlarni birlashtirish
    return {
      ...baseProjection,
      ...(categoryFields[category] || {}),
    };
  }

  async findAll({
    sample = false,
    page = 1,
    limit = 10,
    category,
    coordinates,
    search,
    is_premium,
    is_verified,
    is_new,
    rating,
    radius,
    language = EnumLanguage.UZ,
  }: FindAllPropertiesDto & { language: EnumLanguage }) {
    const match: FilterQuery<PropertyDocument> = {};

    // Filterlar
    if (category) match.category = category;
    if (is_premium !== undefined) match.is_premium = is_premium;
    if (is_verified !== undefined) match.is_verified = is_verified;
    if (is_new) {
      match.createdAt = { $gte: new Date(Date.now() - 604800000) };
    }
    if (rating) match.rating = { $gte: rating };

    // Search
    if (search) {
      match.$or = [
        { [`title.${language}`]: { $regex: search, $options: 'i' } },
        { [`description.${language}`]: { $regex: search, $options: 'i' } },
        { [`address.${language}`]: { $regex: search, $options: 'i' } },
      ];
    }

    const pipeline: any[] = [];

    // GeoNear
    if (coordinates && radius) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates },
          distanceField: 'distance',
          maxDistance: radius,
          spherical: true,
          query: match,
        },
      });
    } else {
      pipeline.push({ $match: match });
    }

    // Sample yoki Pagination
    if (sample) {
      pipeline.push({ $sample: { size: limit } });
    } else {
      pipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      );
    }

    // VARIANT 1: $addFields (barcha fieldlarni saqlaydi) - TAVSIYA ETILADI
    pipeline.push({
      $addFields: {
        title: { $ifNull: [`$title.${language}`, '$title.uz'] },
        description: {
          $ifNull: [`$description.${language}`, '$description.uz'],
        },
        address: { $ifNull: [`$address.${language}`, '$address.uz'] },
      },
    });

    // VARIANT 2: $project (faqat kerakli fieldlar) - Network traffic kamaytirish uchun
    // Agar $project ishlatmoqchi bo'lsangiz, $addFields o'rniga quyidagini ishlating:
    /*
  pipeline.push({
    $project: this.getProjectionByCategory(language, category),
  });
  */

    // Parallel execution
    const [data, totalItems] = await Promise.all([
      this.propertyModel.aggregate(pipeline).exec(),
      sample ? Promise.resolve(null) : this.propertyModel.countDocuments(match),
    ]);

    return {
      totalItems,
      totalPages: totalItems ? Math.ceil(totalItems / limit) : null,
      page: sample ? null : page,
      limit,
      data,
    };
  }

  // BONUS: Bitta property olish uchun helper
  async findOne(id: string, language: EnumLanguage = EnumLanguage.UZ) {
    const property = await this.propertyModel.findById(id).lean().exec();

    if (!property) {
      throw new NotFoundException('Property topilmadi');
    }

    // Tilni o'zgartirish
    return {
      ...property,
      title: property.title?.[language] || property.title?.uz,
      description: property.description?.[language] || property.description?.uz,
      address: property.address?.[language] || property.address?.uz,
    };
  }

  async findMyProperties({
    search,
    author,
    language,
    page = 1,
    limit = 10,
  }: {
    search?: string;
    author?: string;
    language?: EnumLanguage;
    page?: number;
    limit?: number;
  }) {
    if (!author) {
      throw new NotFoundException('Author not found!');
    }

    // Base match: faqat author
    const match: FilterQuery<PropertyDocument> = { author };

    // Search bo'lsa language field bo'yicha qidirish
    if (search) {
      const langField = language || 'uz';
      match.$or = [
        { [`title.${langField}`]: { $regex: search, $options: 'i' } },
        { [`description.${langField}`]: { $regex: search, $options: 'i' } },
        { [`address.${langField}`]: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const aggregation = this.propertyModel.aggregate([
      { $match: match },
      {
        $addFields: {
          title: { $ifNull: [`$title.${language}`, '$title.uz'] },
          description: {
            $ifNull: [`$description.${language}`, '$description.uz'],
          },
          address: { $ifNull: [`$address.${language}`, '$address.uz'] },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const data = await aggregation.exec();

    // Umumiy sonini olish uchun alohida count
    const totalItems = await this.propertyModel.countDocuments(match);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      totalItems,
      totalPages,
      page,
      limit,
      data,
    };
  }

  async findById({ id, language }: { id: string; language?: EnumLanguage }) {
    const property = await this.propertyModel
      .findById(id)
      .populate('author')
      .lean()
      .exec();
    if (!property) {
      throw new NotFoundException('Property not found!');
    }
    return {
      ...property,
      title: property.title[language ?? 'uz'] ?? property.title.uz,
      description:
        property.description[language ?? 'uz'] ?? property.description.uz,
      address: property.address[language ?? 'uz'] ?? property.address.uz,
    };
  }
}
