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
import { EnumPropertyCategory } from './enums/property-category.enum';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';
import { MessageService } from '../message/message.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { EnumPropertyStatus } from './enums/property-status.enum';
import { Tag, TagDocument } from './schemas/tag.schema';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_RENT)
    private readonly apartmentRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_SALE)
    private readonly apartmentSaleModel: Model<PropertyDocument>,
    @InjectModel(Tag.name)
    private readonly tagModel: Model<TagDocument>,
    private readonly fileService: FileService,
    private readonly openaiService: OpenaiService,
    private readonly messageService: MessageService,
  ) {}

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
      await this.saveTags(tags);
    }

    return property;
  }

  private async saveTags(tags: string[]): Promise<void> {
    try {
      // Har bir tagni lowercase va trim qilamiz
      const uniqueTags = Array.from(
        new Set(tags.map((tag) => tag.toLowerCase().trim())),
      ).filter((tag) => tag.length > 0);

      // Bulk upsert - agar tag mavjud bo'lsa o'tkazib yuboradi
      const operations = uniqueTags.map((tag) => ({
        updateOne: {
          filter: { value: tag },
          update: { $setOnInsert: { value: tag } },
          upsert: true,
        },
      }));

      if (operations.length > 0) {
        await this.tagModel.bulkWrite(operations, {
          ordered: false,
        });
      }
    } catch (error) {
      console.error(error);
    }
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
    return {
      ...property,
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

    const hasMessage = await this.messageService.findByUser(user);
    if (hasMessage) {
      throw new BadRequestException(
        'You have left feedback for this property.',
      );
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

  // ****************************************
  async searchTags(query: string, limit = 20) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const regex = new RegExp(`^${query.trim()}`, 'i');

    const tags = await this.tagModel
      .find({ value: regex })
      .limit(limit)
      .lean()
      .exec();

    return tags.map((t) => ({
      _id: t._id,
      value: t.value,
    }));
  }

  async getAllTags(limit = 100) {
    const tags = await this.tagModel
      .find()
      .limit(limit)
      .sort({ value: 1 })
      .lean()
      .exec();

    return tags.map((t) => t.value);
  }
}
