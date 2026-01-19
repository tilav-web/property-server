import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Property, PropertyDocument } from './schemas/property.schema';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';
import { FileService } from '../file/file.service';
import { OpenaiService } from '../openai/openai.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { EnumPropertyCategory } from './enums/property-category.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';
import { MessageService } from '../message/message.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { EnumPropertyStatus } from './enums/property-status.enum';
import { Seller, SellerDocument } from '../seller/schemas/seller.schema';
import { TagService } from '../tag/tag.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { ApartmentRentDocument } from './schemas/categories/apartment-rent.schema';
import { ApartmentSaleDocument } from './schemas/categories/apartment-sale.schema';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_RENT)
    private readonly apartmentRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_SALE)
    private readonly apartmentSaleModel: Model<PropertyDocument>,
    @InjectModel(Seller.name)
    private readonly sellerModel: Model<SellerDocument>,
    private readonly fileService: FileService,
    private readonly openaiService: OpenaiService,
    private readonly messageService: MessageService,
    private readonly tagService: TagService,
  ) { }

  async onModuleInit() {
    const textIndexName =
      'title.uz_text_title.ru_text_title.en_text_description.uz_text_description.ru_text_description.en_text_address.uz_text_address.ru_text_address.en_text';
    try {
      await this.propertyModel.collection.dropIndex(textIndexName);
    } catch (error) {
      console.error(error);
    }
    await this.propertyModel.createIndexes();
  }

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
      ? await this.fileService.saveFiles({
        files: files.photos,
        folder: EnumFilesFolder.PHOTOS,
      })
      : [];

    const videos = files?.videos?.length
      ? await this.fileService.saveFiles({
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

    const [tags, translations] = await this.openaiService.translateTexts({
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
      title: translations.title,
      description: translations.description,
      address: translations.address,
    });

    if (tags.length > 0) {
      await this.tagService.saveTags(tags);
    }

    return property;
  }

  async findAll(dto: FindAllPropertiesDto & { language: EnumLanguage }) {
    const {
      sample = false,
      page = 1,
      limit = 10,
      category,
      search,
      is_premium,
      is_new,
      rating,
      filterCategory,
      language = EnumLanguage.UZ,
      bathrooms,
      bedrooms,
      sw_lng,
      sw_lat,
      ne_lng,
      ne_lat,
    } = dto;

    const isMapView =
      sw_lng !== undefined &&
      sw_lat !== undefined &&
      ne_lng !== undefined &&
      ne_lat !== undefined;

    const match = this.buildMatchQuery({
      category,
      is_premium,
      is_new,
      rating,
      search,
      filterCategory,
      bathrooms,
      bedrooms,
      sw_lng,
      sw_lat,
      ne_lng,
      ne_lat,
    });

    if (sample) {
      return this.executeSampleQuery({
        match,
        limit,
        language,
        category,
        isMapView,
      });
    }

    const result = await this.executePaginationQuery({
      match,
      page,
      limit,
      language,
      category,
      isMapView,
    });

    let areaKey: string | null = null;
    if (isMapView) {
      const centerLat = (sw_lat + ne_lat) / 2;
      const centerLng = (sw_lng + ne_lng) / 2;
      areaKey = this.getAreaKey(centerLat, centerLng);
    }

    return {
      ...result,
      areaKey: areaKey || null,
    };
  }

  private areaKeyCache = new Map<string, string>();

  private getAreaKey(lat: number, lng: number): string {
    const cacheKey = `${lat}:${lng}`;
    if (this.areaKeyCache.has(cacheKey)) {
      return this.areaKeyCache.get(cacheKey)!;
    }

    const AREA_SIZE = 0.2;
    const latKey = (Math.floor(lat / AREA_SIZE) * AREA_SIZE).toFixed(1);
    const lngKey = (Math.floor(lng / AREA_SIZE) * AREA_SIZE).toFixed(1);
    const areaKey = `${latKey}:${lngKey}`;

    this.areaKeyCache.set(cacheKey, areaKey);
    return areaKey;
  }

  private buildMatchQuery({
    category,
    is_premium,
    is_new,
    rating,
    search,
    filterCategory,
    bathrooms,
    bedrooms,
    sw_lng,
    sw_lat,
    ne_lng,
    ne_lat,
  }: {
    category?: string;
    is_premium?: boolean;
    is_new?: boolean;
    rating?: number;
    search?: string;
    filterCategory?: string;
    bathrooms?: number[];
    bedrooms?: number[];
    sw_lng?: number;
    sw_lat?: number;
    ne_lng?: number;
    ne_lat?: number;
  }): FilterQuery<PropertyDocument> {
    const match: FilterQuery<PropertyDocument> = {
      status: EnumPropertyStatus.APPROVED,
      is_archived: false,
    };

    if (
      sw_lng !== undefined &&
      sw_lat !== undefined &&
      ne_lng !== undefined &&
      ne_lat !== undefined
    ) {
      match.location = {
        $geoWithin: {
          $box: [
            [sw_lng, sw_lat],
            [ne_lng, ne_lat],
          ],
        },
      };
    }

    if (category) match.category = category;
    if (is_premium !== undefined) match.is_premium = is_premium;

    if (is_new) {
      match.createdAt = { $gte: new Date(Date.now() - 604800000) };
    }

    if (rating) match.rating = { $gte: rating };

    if (search) {
      match.$text = { $search: search };
    }

    if (filterCategory && !category) {
      match.category = { $regex: `^${filterCategory}`, $options: 'i' };
    }

    if (bedrooms?.length) {
      const exact = bedrooms.filter((v) => v < 7);
      const hasSevenPlus = bedrooms.includes(7);

      if (exact.length && hasSevenPlus) {
        match.$or = match.$or || [];
        match.$or.push({ bedrooms: { $in: exact } }, { bedrooms: { $gte: 7 } });
      } else if (exact.length) {
        match.bedrooms = { $in: exact };
      } else if (hasSevenPlus) {
        match.bedrooms = { $gte: 7 };
      }
    }

    if (bathrooms?.length) {
      const exact = bathrooms.filter((v) => v < 7);
      const hasSevenPlus = bathrooms.includes(7);

      if (exact.length && hasSevenPlus) {
        match.$or = match.$or || [];
        match.$or.push(
          { bathrooms: { $in: exact } },
          { bathrooms: { $gte: 7 } },
        );
      } else if (exact.length) {
        match.bathrooms = { $in: exact };
      } else if (hasSevenPlus) {
        match.bathrooms = { $gte: 7 };
      }
    }

    return match;
  }

  private async executeSampleQuery({
    match,
    limit,
    language,
    category,
    isMapView,
  }: {
    match: FilterQuery<PropertyDocument>;
    limit: number;
    language: EnumLanguage;
    category?: string;
    isMapView?: boolean;
  }) {
    const pipeline: any[] = [];

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push(
      { $sample: { size: limit } },
      { $project: this.getProjectionByCategory(language, category, isMapView) },
    );

    const properties = await this.propertyModel.aggregate(pipeline).exec();

    return {
      properties,
      totalItems: null,
      totalPages: null,
      page: null,
      limit,
    };
  }

  private async executePaginationQuery({
    match,
    page,
    limit,
    language,
    category,
    isMapView,
  }: {
    match: FilterQuery<PropertyDocument>;
    page: number;
    limit: number;
    language: EnumLanguage;
    category?: string;
    isMapView?: boolean;
  }) {
    const pipeline: any[] = [];

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: this.getProjectionByCategory(language, category, isMapView) },
    );

    const [properties, totalItems] = await Promise.all([
      this.propertyModel.aggregate(pipeline).exec(),
      this.getCount(match),
    ]);

    return {
      properties,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      page,
      limit,
    };
  }

  private async getCount(
    match: FilterQuery<PropertyDocument>,
  ): Promise<number> {
    return this.propertyModel.countDocuments(match).exec();
  }

  private getProjectionByCategory(
    language: EnumLanguage,
    category?: string,
    isMapView?: boolean,
  ) {
    const baseProjection: {
      [key: string]:
      | 1
      | { $ifNull: (string | { $slice: (string | number)[] })[] }
      | { $slice: (string | number)[] };
    } = {
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
      status: 1,
      is_archived: 1,
      rating: 1,
      liked: 1,
      saved: 1,
      videos: 1,
      createdAt: 1,
    };

    if (isMapView) {
      baseProjection.photos = { $slice: ['$photos', 1] };
    } else {
      baseProjection.photos = 1;
    }

    if (!category) return baseProjection;

    const categoryFields: Record<string, Record<string, number>> = {
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
        contract_duration_months: 1,
      },
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
        mortgage_available: 1,
      },
    };

    return {
      ...baseProjection,
      ...(categoryFields[category] || {}),
    };
  }

  async findMyProperties({
    search,
    author,
    language = EnumLanguage.UZ,
    page = 1,
    limit = 10,
  }: {
    search?: string;
    author?: string;
    language?: EnumLanguage;
    page?: number;
    limit?: number;
  }) {
    if (!author) throw new NotFoundException('Author not found!');

    const match: FilterQuery<PropertyDocument> = {
      author: new Types.ObjectId(author),
    };

    // To‘g‘ri qidiruv (text indexsiz ham ishlaydi)
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      match.$or = [
        { 'title.uz': regex },
        { 'title.ru': regex },
        { 'title.en': regex },
        { 'description.uz': regex },
        { 'description.ru': regex },
        { 'description.en': regex },
        { 'address.uz': regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [properties, totalItems] = await Promise.all([
      this.propertyModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() // Muhim! → oddiy JS object qaytaradi
        .exec(),

      // countDocuments to‘g‘ri ishlaydi
      this.propertyModel.countDocuments(match).exec(),
    ]);

    // Tilni JS da to‘g‘ri tanlash — eng tezkor va ishonchli usul
    const translated = properties.map((p) => ({
      ...p,
      title: p.title?.[language] ?? p.title?.uz ?? '',
      description: p.description?.[language] ?? p.description?.uz ?? '',
      address: p.address?.[language] ?? p.address?.uz ?? '',
    }));

    return {
      properties: translated,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      page,
      limit,
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

    const seller = await this.sellerModel
      .findOne({ user: property.author._id })
      .lean()
      .exec();

    return {
      ...property,
      author: {
        ...property.author,
        seller,
      },
      title: property.title[language ?? 'uz'] ?? property.title.uz,
      description:
        property.description[language ?? 'uz'] ?? property.description.uz,
      address: property.address[language ?? 'uz'] ?? property.address.uz,
    };
  }

  async remove({ id, userId }: { id: string; userId: string }) {
    const property = await this.propertyModel.findById(id).exec();

    if (!property) {
      throw new NotFoundException('Property not found!');
    }

    if (property.author.toString() !== userId.toString()) {
      throw new ForbiddenException(
        "You don't have permission to delete this property.",
      );
    }

    // Barcha foto va videolarni parallel o'chirish (async deleteFile ishlatilgani uchun)
    const deletePromises = [
      ...property.photos.map((photoUrl) =>
        this.fileService.deleteFile(photoUrl),
      ),
      ...property.videos.map((videoUrl) =>
        this.fileService.deleteFile(videoUrl),
      ),
    ];

    // Hammasi tugashini kutamiz, xato bo'lsa ham davom etaveradi (fire-and-forget emas, to'liq kuzatiladi)
    await Promise.allSettled(deletePromises);

    // Property ni o'chirish (oxirida qilish yaxshi – fayllar avval o'chirilsin)
    await property.deleteOne();

    return property;
  }

  async updateStatus({
    id,
    status,
  }: {
    id: string;
    status: EnumPropertyStatus;
  }) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found!');
    }
    property.status = status;
    return property.save();
  }

  async toggleArchive({ id, userId }: { id: string; userId: string }) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found!');
    }
    if (property.author.toString() !== userId) {
      throw new ForbiddenException('You can only archive your own properties.');
    }
    if (property.status !== EnumPropertyStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved properties can be archived or unarchived.',
      );
    }
    property.is_archived = !property.is_archived;
    return property.save();
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

  async getCategories(): Promise<{ category: string; count: number }[]> {
    // 1 ta database call - super tez!
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: EnumPropertyStatus.APPROVED,
          is_archived: false,
        },
      },
      {
        $group: {
          _id: { $arrayElemAt: [{ $split: ['$category', '_'] }, 0] },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
        },
      },
    ];

    interface CategoryCountResult {
      category: string;
      count: number;
    }

    const categories =
      await this.propertyModel.aggregate<CategoryCountResult>(pipeline);

    return categories;
  }

  async findOnePropertyForUpdate({ propertyId, authorId }: { propertyId: string; authorId: string }) {
    const property = await this.propertyModel.findById(propertyId).lean().exec();
    if (!property) {
      throw new NotFoundException('Property not found!');
    }
    if (property.author.toString() !== authorId.toString()) {
      throw new ForbiddenException("You don't have permission to update this property.");
    }
    return property;
  }

  async update({
    id,
    userId,
    dto,
    files,
  }: {
    id: string;
    userId: string;
    dto: UpdatePropertyDto;
    files?: {
      new_photos?: Express.Multer.File[];
      new_videos?: Express.Multer.File[];
    };
  }) {
    // Avval base modeldan topamiz
    const property = await this.propertyModel.findById(id).exec();

    if (!property) {
      throw new NotFoundException('Property not found!');
    }

    if (property.author.toString() !== userId.toString()) {
      throw new ForbiddenException(
        "You don't have permission to update this property.",
      );
    }

    // Agar kategoriya o'zgarsa, xatolik beramiz
    if (dto.category && dto.category !== property.category) {
      throw new BadRequestException(
        "Kategoriyani o'zgartirish mumkin emas. Yangi e'lon yarating.",
      );
    }

    // Kategoriyaga qarab to'g'ri modelni tanlaymiz va TO'G'RI TURLANGAN document olamiz
    const category = property.category;
    let typedProperty: ApartmentRentDocument | ApartmentSaleDocument;

    switch (category) {
      case EnumPropertyCategory.APARTMENT_RENT:
        typedProperty = (await this.apartmentRentModel
          .findById(id)
          .exec()) as unknown as ApartmentRentDocument;
        break;
      case EnumPropertyCategory.APARTMENT_SALE:
        typedProperty = (await this.apartmentSaleModel
          .findById(id)
          .exec()) as unknown as ApartmentSaleDocument;
        break;
      default:
        throw new BadRequestException("Qo'llab-quvvatlanmaydigan kategoriya");
    }

    if (!typedProperty) {
      throw new NotFoundException('Property not found with specific model!');
    }

    // 1. Handle File Deletions
    if (dto.photos_to_delete?.length) {
      await Promise.all(
        dto.photos_to_delete.map((url) => this.fileService.deleteFile(url)),
      );
      typedProperty.photos = typedProperty.photos.filter(
        (url) => !dto.photos_to_delete?.includes(url),
      );
    }
    if (dto.videos_to_delete?.length) {
      await Promise.all(
        dto.videos_to_delete.map((url) => this.fileService.deleteFile(url)),
      );
      typedProperty.videos = typedProperty.videos.filter(
        (url) => !dto.videos_to_delete?.includes(url),
      );
    }

    // 2. Handle File Uploads
    if (files?.new_photos?.length) {
      const newPhotoUrls = await this.fileService.saveFiles({
        files: files.new_photos,
        folder: EnumFilesFolder.PHOTOS,
      });
      typedProperty.photos.push(...newPhotoUrls);
    }
    if (files?.new_videos?.length) {
      const newVideoUrls = await this.fileService.saveFiles({
        files: files.new_videos,
        folder: EnumFilesFolder.VIDEOS,
      });
      typedProperty.videos.push(...newVideoUrls);
    }

    // 3. Update language fields
    if (dto.title_uz !== undefined) typedProperty.title.uz = dto.title_uz;
    if (dto.title_ru !== undefined) typedProperty.title.ru = dto.title_ru;
    if (dto.title_en !== undefined) typedProperty.title.en = dto.title_en;

    if (dto.description_uz !== undefined)
      typedProperty.description.uz = dto.description_uz;
    if (dto.description_ru !== undefined)
      typedProperty.description.ru = dto.description_ru;
    if (dto.description_en !== undefined)
      typedProperty.description.en = dto.description_en;

    if (dto.address_uz !== undefined) typedProperty.address.uz = dto.address_uz;
    if (dto.address_ru !== undefined) typedProperty.address.ru = dto.address_ru;
    if (dto.address_en !== undefined) typedProperty.address.en = dto.address_en;

    // 4. Update location
    if (dto.location_lat !== undefined && dto.location_lng !== undefined) {
      typedProperty.location = {
        type: 'Point',
        coordinates: [dto.location_lng, dto.location_lat],
      };
    }

    // 5. Update common fields
    if (dto.currency !== undefined) typedProperty.currency = dto.currency;
    if (dto.price !== undefined) typedProperty.price = dto.price;
    if (dto.is_archived !== undefined)
      typedProperty.is_archived = dto.is_archived;

    // 6. Update category-specific fields
    if (dto.bedrooms !== undefined) typedProperty.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) typedProperty.bathrooms = dto.bathrooms;
    if (dto.floor_level !== undefined)
      typedProperty.floor_level = dto.floor_level;
    if (dto.total_floors !== undefined)
      typedProperty.total_floors = dto.total_floors;
    if (dto.area !== undefined) typedProperty.area = dto.area;
    if (dto.balcony !== undefined) typedProperty.balcony = dto.balcony;
    if (dto.furnished !== undefined) typedProperty.furnished = dto.furnished;
    if (dto.repair_type !== undefined)
      typedProperty.repair_type = dto.repair_type;
    if (dto.heating !== undefined) typedProperty.heating = dto.heating;
    if (dto.air_conditioning !== undefined)
      typedProperty.air_conditioning = dto.air_conditioning;
    if (dto.parking !== undefined) typedProperty.parking = dto.parking;
    if (dto.elevator !== undefined) typedProperty.elevator = dto.elevator;
    if (dto.amenities !== undefined)
      typedProperty.amenities = dto.amenities as any;

    // A type guard is needed for fields that are not common
    if (typedProperty.category === EnumPropertyCategory.APARTMENT_RENT) {
      if (dto.contract_duration_months !== undefined) {
        (typedProperty as ApartmentRentDocument).contract_duration_months =
          dto.contract_duration_months;
      }
    } else if (typedProperty.category === EnumPropertyCategory.APARTMENT_SALE) {
      if (dto.mortgage_available !== undefined) {
        (typedProperty as ApartmentSaleDocument).mortgage_available =
          dto.mortgage_available;
      }
    }

    typedProperty.status = EnumPropertyStatus.PENDING;

    // Mark nested fields as modified
    typedProperty.markModified('title');
    typedProperty.markModified('description');
    typedProperty.markModified('address');
    if (dto.location_lat !== undefined || dto.location_lng !== undefined) {
      typedProperty.markModified('location');
    }

    return typedProperty.save();
  }
}
