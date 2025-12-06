import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Property, PropertyDocument } from './schemas/property.schema';
import { FilterQuery, Model } from 'mongoose';
import { FileService } from '../file/file.service';
import { GenaiService } from '../genai/genai.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { EnumPropertyCategory } from './enums/property-category.enum';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';
import { MessageService } from '../message/message.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';

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
    private readonly genaiService: GenaiService,
    private readonly messageService: MessageService,
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

    const language = await this.genaiService.translateTexts({
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
      _id: 1,
      author: 1,
      title: { $ifNull: [`$title.${language}`, '$title.uz'] },
      description: { $ifNull: [`$description.${language}`, '$description.uz'] },
      address: { $ifNull: [`$address.${language}`, '$address.uz'] },
      category: 1,
      location: 1,
      currency: 1,

      price: 1,
      is_premium: 1,
      is_verified: 1,
      rating: 1,
      liked: 1,
      saved: 1,
      photos: 1,
      videos: 1,
    };

    // Agar category ko'rsatilmagan bo'lsa, faqat base fieldlarni qaytarish
    if (!category) return baseProjection;

    // Category-specific fieldlar
    const categoryFields: Record<string, Record<string, number>> = {
      // 🏢 APARTMENT_RENT - Kvartira Ijarasi
      APARTMENT_RENT: {
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
    lng,
    lat,
    search,
    is_premium,
    is_verified,
    is_new,
    rating,
    radius,
    language = EnumLanguage.UZ,
    filterCategory,
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

    if (filterCategory && !category) {
      match.category = { $regex: filterCategory, $options: 'i' };
    }

    const pipeline: any[] = [];

    if (lng !== undefined && lat !== undefined && radius) {
      const coordinates: [number, number] = [lng, lat];
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates },
          distanceField: 'distance',
          maxDistance: radius,
          spherical: true,
          query: match, // ✅ Filterlarni query ichida beramiz
        },
      });
    } else {
      if (Object.keys(match).length > 0) {
        pipeline.push({ $match: match });
      }
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

    pipeline.push({
      $project: this.getProjectionByCategory(language, category),
    });

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
      properties: data,
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
      properties: data,
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

  async remove({ id, userId }: { id: string; userId: string }) {
    const property = await this.propertyModel.findByIdAndDelete(id).exec();
    if (!property) {
      throw new NotFoundException('Property not found!');
    }

    if (property.author.toString() !== userId.toString()) {
      throw new BadRequestException(
        "You don't have permission to delete this property.",
      );
    }

    property.photos.forEach((photoUrl) =>
      this.fileService.deleteFile(photoUrl),
    );
    property.videos.forEach((videoUrl) =>
      this.fileService.deleteFile(videoUrl),
    );

    return property;
  }

  async sendMessage({ dto, user }: { dto: CreateMessageDto; user: string }) {
    const property = await this.propertyModel.findById(dto.property);
    if (!property) {
      throw new NotFoundException('Property not found!');
    }

    const { message, rating } = await this.messageService.create({
      ...dto,
      user,
    });

    if (message && property.author) {
      await this.messageService.createMessageStatus({
        message: message?._id as string,
        seller: property.author.toString(),
      });
    }

    property.rating = rating ?? property.rating;
    await property.save();

    return message;
  }

  async getCategories() {
    const filterCategories = Object.values(EnumPropertyCategory);

    const counts = await Promise.all(
      filterCategories.map(async (category) => {
        const count = await this.propertyModel.countDocuments({ category });
        return { category, count };
      }),
    );
    return counts;
  }

  // async update({
  //   id,
  //   dto,
  //   files,
  //   author,
  // }: {
  //   id: string;
  //   dto: UpdatePropertyDto;
  //   files: {
  //     photos?: Express.Multer.File[];
  //     videos?: Express.Multer.File[];
  //   };
  //   author?: string;
  // }) {
  //   // 1. Find the property with the base model to check existence and author
  //   const baseProperty = await this.propertyModel.findById(id).lean();
  //   if (!baseProperty) {
  //     throw new NotFoundException('E`lon topilmadi!');
  //   }

  //   // 2. Authorize the user
  //   if (baseProperty.author.toString() !== author) {
  //     throw new ForbiddenException(
  //       'Sizda ushbu e`lonni tahrirlashga ruxsat yo`q!',
  //     );
  //   }

  //   // 3. Select the correct model based on the property's category
  //   let propertyModel: Model<PropertyDocument>;
  //   switch (baseProperty.category) {
  //     case EnumPropertyCategory.APARTMENT_RENT:
  //       propertyModel = this.apartmentRentModel;
  //       break;
  //     case EnumPropertyCategory.APARTMENT_SALE:
  //       propertyModel = this.apartmentSaleModel;
  //       break;
  //     default:
  //       // Fallback to the base model if category is somehow unknown
  //       propertyModel = this.propertyModel;
  //       break;
  //   }

  //   // 4. Fetch the fully-typed document using the correct model
  //   const property = await propertyModel.findById(id);
  //   if (!property) {
  //     // This should theoretically never happen if baseProperty was found
  //     throw new NotFoundException('E`lon topilmadi!');
  //   }

  //   // 5. Conditionally update fields from DTO
  //   if (dto.title) property.title = dto.title;
  //   if (dto.description) property.description = dto.description;
  //   if (dto.address) property.address = dto.address;
  //   if (dto.price) property.price = dto.price;
  //   if (dto.currency) property.currency = dto.currency;
  //   if (dto.bedrooms) property.bedrooms = dto.bedrooms;
  //   if (dto.bathrooms) property.bathrooms = dto.bathrooms;
  //   if (dto.floor_level) property.floor_level = dto.floor_level;
  //   if (dto.total_floors) property.total_floors = dto.total_floors;
  //   if (dto.area) property.area = dto.area;
  //   if (dto.balcony !== undefined) property.balcony = dto.balcony;
  //   if (dto.furnished !== undefined) property.furnished = dto.furnished;
  //   if (dto.repair_type) property.repair_type = dto.repair_type;
  //   if (dto.heating) property.heating = dto.heating;
  //   if (dto.air_conditioning !== undefined)
  //     property.air_conditioning = dto.air_conditioning;
  //   if (dto.parking !== undefined) property.parking = dto.parking;
  //   if (dto.elevator !== undefined) property.elevator = dto.elevator;
  //   if (dto.amenities) property.amenities = dto.amenities;
  //   if (dto.contract_duration_months)
  //     property.contract_duration_months = dto.contract_duration_months;
  //   if (dto.mortgage_available !== undefined)
  //     property.mortgage_available = dto.mortgage_available;

  //   // 6. Handle location update
  //   if (dto.location_lat && dto.location_lng) {
  //     property.location = {
  //       type: 'Point',
  //       coordinates: [dto.location_lng, dto.location_lat],
  //     };
  //   }

  //   // 7. Handle file updates
  //   if (files?.photos?.length) {
  //     // Delete old photos
  //     property.photos.forEach((photoUrl) =>
  //       this.fileService.deleteFile(photoUrl),
  //     );
  //     // Save new photos
  //     property.photos = this.fileService.saveFiles({
  //       files: files.photos,
  //       folder: EnumFilesFolder.PHOTOS,
  //     });
  //   }

  //   if (files?.videos?.length) {
  //     // Delete old videos
  //     property.videos.forEach((videoUrl) =>
  //       this.fileService.deleteFile(videoUrl),
  //     );
  //     // Save new videos
  //     property.videos = this.fileService.saveFiles({
  //       files: files.videos,
  //       folder: EnumFilesFolder.VIDEOS,
  //     });
  //   }

  //   // 8. Save the updated document and return it
  //   return await property.save();
  // }
}
