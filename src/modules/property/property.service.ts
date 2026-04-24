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
import { EnumPropertyCategoryFilter } from './enums/property-category-filter.enum';
import { SortOption } from './enums/sort-option.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { CurrencyCode } from 'src/common/currencies';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';
import { MessageService } from '../message/message.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { EnumPropertyStatus } from './enums/property-status.enum';
import { Seller, SellerDocument } from '../seller/schemas/seller.schema';
import { TagService } from '../tag/tag.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { ApartmentRentDocument } from './schemas/categories/apartment-rent.schema';
import { ApartmentSaleDocument } from './schemas/categories/apartment-sale.schema';
import { PropertySearchCache } from './property-search.cache';

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
    private readonly searchCache: PropertySearchCache,
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

    // 🧮 Rasmlar minimum soni — xonalar soniga bog'liq (kamida 1, xonalar>=1 bo'lsa
    // xonalar soniga teng yoki undan ko'p bo'lishi kerak).
    const bedroomsRaw = (dto as { bedrooms?: number | string }).bedrooms;
    const bedrooms =
      typeof bedroomsRaw === 'string' ? Number(bedroomsRaw) : bedroomsRaw;
    const requiredPhotos = Math.max(bedrooms ?? 0, 1);
    const providedPhotos = files?.photos?.length ?? 0;
    if (providedPhotos < requiredPhotos) {
      throw new BadRequestException(
        `Kamida ${requiredPhotos} ta rasm yuklash talab qilinadi` +
          (bedrooms && bedrooms >= 1
            ? ` (xonalar soni: ${bedrooms})`
            : ''),
      );
    }

    const savedFileUrls: string[] = [];

    try {
      // Fayllarni saqlash
      const photos = files?.photos?.length
        ? await this.fileService.saveFiles({
            files: files.photos,
            folder: EnumFilesFolder.PHOTOS,
          })
        : [];
      savedFileUrls.push(...photos);

      const videos = files?.videos?.length
        ? await this.fileService.saveFiles({
            files: files.videos,
            folder: EnumFilesFolder.VIDEOS,
          })
        : [];
      savedFileUrls.push(...videos);

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

      this.searchCache.invalidate();
      return property;
    } catch (error) {
      await Promise.allSettled(
        savedFileUrls.map((url) => this.fileService.deleteFile(url)),
      );
      throw error;
    }
  }

  async findAll(dto: FindAllPropertiesDto & { language: EnumLanguage }) {
    const {
      sample = false,
      page = 1,
      limit = 10,
      category,
      currency,
      search,
      is_premium,
      is_new,
      rating,
      filterCategory,
      language = EnumLanguage.EN,
      bathrooms,
      bedrooms,
      sw_lng,
      sw_lat,
      ne_lng,
      ne_lat,
      lat,
      lng,
      radius,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      amenities,
      furnished,
      sort,
    } = dto;

    const isMapView =
      sw_lng !== undefined &&
      sw_lat !== undefined &&
      ne_lng !== undefined &&
      ne_lat !== undefined;

    // Map view needs more properties in one call (bbox + clustering);
    // list views stay capped lower to keep payloads small.
    const maxLimit = isMapView ? 200 : 50;
    const safeLimit = Math.min(Math.max(limit, 1), maxLimit);
    const safePage = Math.max(page, 1);

    const match = this.buildMatchQuery({
      category,
      currency,
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
      lat,
      lng,
      radius,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      amenities,
      furnished,
    });

    if (sample) {
      return this.executeSampleQuery({
        match,
        limit: safeLimit,
        language,
        category,
        isMapView,
      });
    }

    const cacheKey = this.searchCache.makeKey({
      match,
      page: safePage,
      limit: safeLimit,
      language,
      category,
      isMapView,
      sort,
    });
    const cached = this.searchCache.get<{
      properties: unknown[];
      totalItems: number | null;
      totalPages: number | null;
      page: number;
      limit: number;
      areaKey: string | null;
    }>(cacheKey);
    if (cached) return cached;

    const result = await this.executePaginationQuery({
      match,
      page: safePage,
      limit: safeLimit,
      language,
      category,
      isMapView,
      sort,
      lat,
      lng,
      radius,
    });

    let areaKey: string | null = null;
    if (isMapView) {
      const centerLat = (sw_lat + ne_lat) / 2;
      const centerLng = (sw_lng + ne_lng) / 2;
      areaKey = this.getAreaKey(centerLat, centerLng);
    }

    const response = {
      ...result,
      areaKey: areaKey || null,
    };

    this.searchCache.set(cacheKey, response);
    return response;
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

  private buildRoomFilter(
    values: number[] | undefined,
    field: 'bedrooms' | 'bathrooms',
    plusThreshold = 7,
  ): FilterQuery<PropertyDocument> | null {
    if (!values?.length) return null;

    const exact = values.filter((v) => v < plusThreshold);
    const hasPlus = values.some((v) => v >= plusThreshold);

    if (exact.length && hasPlus) {
      return {
        $or: [
          { [field]: { $in: exact } },
          { [field]: { $gte: plusThreshold } },
        ],
      };
    }
    if (exact.length) return { [field]: { $in: exact } };
    if (hasPlus) return { [field]: { $gte: plusThreshold } };
    return null;
  }

  private buildMatchQuery({
    category,
    currency,
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
    lat,
    lng,
    radius,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    amenities,
    furnished,
  }: {
    category?: string;
    currency?: CurrencyCode;
    is_premium?: boolean;
    is_new?: boolean;
    rating?: number;
    search?: string;
    filterCategory?: EnumPropertyCategoryFilter;
    bathrooms?: number[];
    bedrooms?: number[];
    sw_lng?: number;
    sw_lat?: number;
    ne_lng?: number;
    ne_lat?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    amenities?: string[];
    furnished?: boolean;
  }): FilterQuery<PropertyDocument> {
    const match: FilterQuery<PropertyDocument> = {
      status: EnumPropertyStatus.APPROVED,
      is_archived: false,
    };
    const andClauses: FilterQuery<PropertyDocument>[] = [];

    const hasBbox =
      sw_lng !== undefined &&
      sw_lat !== undefined &&
      ne_lng !== undefined &&
      ne_lat !== undefined;

    if (hasBbox) {
      match.location = {
        $geoWithin: {
          $box: [
            [sw_lng, sw_lat],
            [ne_lng, ne_lat],
          ],
        },
      };
    } else if (
      lat !== undefined &&
      lng !== undefined &&
      radius !== undefined &&
      radius > 0
    ) {
      match.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radius / 6378.1],
        },
      };
    }

    if (category) {
      match.category = category;
    } else if (filterCategory === EnumPropertyCategoryFilter.APARTMENT) {
      match.category = {
        $in: [
          EnumPropertyCategory.APARTMENT_SALE,
          EnumPropertyCategory.APARTMENT_RENT,
        ],
      };
    }

    if (currency) match.currency = currency;
    if (is_premium !== undefined) match.is_premium = is_premium;
    if (is_new) {
      match.createdAt = { $gte: new Date(Date.now() - 604_800_000) };
    }
    if (rating !== undefined) match.rating = { $gte: rating };
    if (search) match.$text = { $search: search };

    const bedroomFilter = this.buildRoomFilter(bedrooms, 'bedrooms');
    if (bedroomFilter) andClauses.push(bedroomFilter);

    const bathroomFilter = this.buildRoomFilter(bathrooms, 'bathrooms');
    if (bathroomFilter) andClauses.push(bathroomFilter);

    if (minPrice !== undefined || maxPrice !== undefined) {
      match.price = {};
      if (minPrice !== undefined) match.price.$gte = minPrice;
      if (maxPrice !== undefined) match.price.$lte = maxPrice;
    }

    if (minArea !== undefined || maxArea !== undefined) {
      match.area = {};
      if (minArea !== undefined) match.area.$gte = minArea;
      if (maxArea !== undefined) match.area.$lte = maxArea;
    }

    if (amenities?.length) match.amenities = { $all: amenities };
    if (furnished !== undefined) match.furnished = furnished;

    if (andClauses.length) match.$and = andClauses;

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

  private getSortStage(sort?: SortOption): Record<string, 1 | -1> {
    switch (sort) {
      case SortOption.OLDEST:
        return { createdAt: 1 };
      case SortOption.PRICE_ASC:
        return { price: 1, createdAt: -1 };
      case SortOption.PRICE_DESC:
        return { price: -1, createdAt: -1 };
      case SortOption.RATING:
        return { rating: -1, createdAt: -1 };
      case SortOption.POPULAR:
        return { liked: -1, saved: -1, createdAt: -1 };
      case SortOption.NEWEST:
      default:
        return { createdAt: -1 };
    }
  }

  private async executePaginationQuery({
    match,
    page,
    limit,
    language,
    category,
    isMapView,
    sort,
    lat,
    lng,
    radius,
  }: {
    match: FilterQuery<PropertyDocument>;
    page: number;
    limit: number;
    language: EnumLanguage;
    category?: string;
    isMapView?: boolean;
    sort?: SortOption;
    lat?: number;
    lng?: number;
    radius?: number;
  }) {
    const pipeline: PipelineStage[] = [];
    const useGeoNear =
      sort === SortOption.DISTANCE && lat !== undefined && lng !== undefined;

    const projection = this.getProjectionByCategory(
      language,
      category,
      isMapView,
    ) as Record<string, unknown>;

    if (useGeoNear) {
      // $geoNear MUST be the first stage and produces its own sort by distance
      const geoMatch = { ...match };
      delete geoMatch.location;

      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance_m',
          spherical: true,
          ...(radius && radius > 0
            ? { maxDistance: radius * 1000 }
            : {}),
          query: geoMatch,
        },
      });
      pipeline.push(
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { ...projection, distance_m: 1 } },
      );
    } else {
      if (Object.keys(match).length > 0) {
        pipeline.push({ $match: match });
      }
      pipeline.push(
        { $sort: this.getSortStage(sort) },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: projection },
      );
    }

    if (page === 1) {
      const countFilter = useGeoNear
        ? this.countFilterForDistance(match, lat!, lng!, radius)
        : match;
      const [properties, totalItems] = await Promise.all([
        this.propertyModel.aggregate(pipeline).exec(),
        this.getCount(countFilter),
      ]);
      return {
        properties,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        page,
        limit,
      };
    }

    const properties = await this.propertyModel.aggregate(pipeline).exec();
    return {
      properties,
      totalItems: null,
      totalPages: null,
      page,
      limit,
    };
  }

  private matchWithoutLocation(
    match: FilterQuery<PropertyDocument>,
  ): FilterQuery<PropertyDocument> {
    const copy = { ...match };
    delete copy.location;
    return copy;
  }

  private countFilterForDistance(
    match: FilterQuery<PropertyDocument>,
    lat: number,
    lng: number,
    radius?: number,
  ): FilterQuery<PropertyDocument> {
    const copy = this.matchWithoutLocation(match);
    if (radius && radius > 0) {
      copy.location = {
        $geoWithin: { $centerSphere: [[lng, lat], radius / 6378.1] },
      };
    }
    return copy;
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
      title: { $ifNull: [`$title.${language}`, '$title.en'] },
      description: { $ifNull: [`$description.${language}`, '$description.en'] },
      address: { $ifNull: [`$address.${language}`, '$address.en'] },
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
        furnished: 1,
        repair_type: 1,
        heating: 1,
        amenities: 1,
        contract_duration_months: 1,
      },
      APARTMENT_SALE: {
        bedrooms: 1,
        bathrooms: 1,
        floor_level: 1,
        total_floors: 1,
        area: 1,
        furnished: 1,
        repair_type: 1,
        heating: 1,
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
    language = EnumLanguage.EN,
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
      title: p.title?.[language] ?? p.title?.en ?? '',
      description: p.description?.[language] ?? p.description?.en ?? '',
      address: p.address?.[language] ?? p.address?.en ?? '',
    }));

    return {
      properties: translated,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      page,
      limit,
    };
  }

  async findById({ id, language, userId }: { id: string; language?: EnumLanguage; userId?: string }) {
    const property = await this.propertyModel
      .findById(id)
      .populate('author')
      .lean()
      .exec();
    if (!property) {
      throw new NotFoundException('Property not found!');
    }

    const isOwner = userId && property.author?._id?.toString() === userId.toString();
    if (!isOwner && (property.is_archived || property.status !== EnumPropertyStatus.APPROVED)) {
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
      title: property.title[language ?? 'en'] ?? property.title.en,
      description:
        property.description[language ?? 'en'] ?? property.description.en,
      address: property.address[language ?? 'en'] ?? property.address.en,
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
    this.searchCache.invalidate();

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
    const saved = await property.save();
    this.searchCache.invalidate();
    return saved;
  }

  async toggleArchive({ id, userId }: { id: string; userId: string }) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found!');
    }
    if (property.author.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only archive your own properties.');
    }
    if (property.status !== EnumPropertyStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved properties can be archived or unarchived.',
      );
    }
    property.is_archived = !property.is_archived;
    const saved = await property.save();
    this.searchCache.invalidate();
    return saved;
  }

  async sendMessage({ dto, user }: { dto: CreateMessageDto; user: string }) {
    return this.messageService.createForProperty({ dto, user });
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

  async getTransactionStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseMatch = {
      status: EnumPropertyStatus.APPROVED,
      is_archived: false,
    };

    const [rentStats, saleStats, totalAll, recentCount] = await Promise.all([
      // All rentals — avg price & count
      this.propertyModel
        .aggregate([
          { $match: { ...baseMatch, category: 'APARTMENT_RENT' } },
          {
            $group: {
              _id: null,
              avgPrice: { $avg: '$price' },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),

      // All sales — avg price & count
      this.propertyModel
        .aggregate([
          { $match: { ...baseMatch, category: 'APARTMENT_SALE' } },
          {
            $group: {
              _id: null,
              avgPrice: { $avg: '$price' },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),

      // Total approved properties
      this.propertyModel.countDocuments(baseMatch),

      // Recent (last 30 days) — for growth indicator
      this.propertyModel.countDocuments({
        ...baseMatch,
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    const total = totalAll || 0;
    const older = total - recentCount;
    const growthPercent =
      older > 0
        ? Math.round(((recentCount - older) / older) * 10000) / 100
        : recentCount > 0
          ? 100
          : 0;

    return {
      newRentals: {
        avgPrice: Math.round(rentStats[0]?.avgPrice || 0),
        count: rentStats[0]?.count || 0,
      },
      sales: {
        avgPrice: Math.round(saleStats[0]?.avgPrice || 0),
        count: saleStats[0]?.count || 0,
      },
      totalTransactions: total,
      growthPercent: Math.round(growthPercent * 100) / 100,
    };
  }

  async findOnePropertyForUpdate({
    propertyId,
    authorId,
  }: {
    propertyId: string;
    authorId: string;
  }) {
    const property = await this.propertyModel
      .findById(propertyId)
      .lean()
      .exec();
    if (!property) {
      throw new NotFoundException('Property not found!');
    }
    if (property.author.toString() !== authorId.toString()) {
      throw new ForbiddenException(
        "You don't have permission to update this property.",
      );
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
      await Promise.allSettled(
        dto.photos_to_delete.map((url) => this.fileService.deleteFile(url)),
      );
      typedProperty.photos = typedProperty.photos.filter(
        (url) => !dto.photos_to_delete?.includes(url),
      );
    }
    if (dto.videos_to_delete?.length) {
      await Promise.allSettled(
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

    // 🧮 Tahrirlangandan keyin rasmlar minimum shartini tekshiramiz.
    const effectiveBedroomsRaw =
      dto.bedrooms ?? (typedProperty as { bedrooms?: number }).bedrooms;
    const effectiveBedrooms =
      typeof effectiveBedroomsRaw === 'string'
        ? Number(effectiveBedroomsRaw)
        : effectiveBedroomsRaw;
    const requiredPhotos = Math.max(effectiveBedrooms ?? 0, 1);
    if (typedProperty.photos.length < requiredPhotos) {
      throw new BadRequestException(
        `Kamida ${requiredPhotos} ta rasm bo'lishi kerak` +
          (effectiveBedrooms && effectiveBedrooms >= 1
            ? ` (xonalar soni: ${effectiveBedrooms})`
            : ''),
      );
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
    if (dto.furnished !== undefined) typedProperty.furnished = dto.furnished;
    if (dto.repair_type !== undefined)
      typedProperty.repair_type = dto.repair_type;
    if (dto.heating !== undefined) typedProperty.heating = dto.heating;
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

    // Agar faqat is_archived o'zgargan bo'lsa, statusni o'zgartirmaymiz
    const hasContentChanges =
      dto.title_uz !== undefined ||
      dto.title_ru !== undefined ||
      dto.title_en !== undefined ||
      dto.description_uz !== undefined ||
      dto.description_ru !== undefined ||
      dto.description_en !== undefined ||
      dto.address_uz !== undefined ||
      dto.address_ru !== undefined ||
      dto.address_en !== undefined ||
      dto.location_lat !== undefined ||
      dto.location_lng !== undefined ||
      dto.currency !== undefined ||
      dto.price !== undefined ||
      dto.bedrooms !== undefined ||
      dto.bathrooms !== undefined ||
      dto.floor_level !== undefined ||
      dto.total_floors !== undefined ||
      dto.area !== undefined ||
      dto.furnished !== undefined ||
      dto.repair_type !== undefined ||
      dto.heating !== undefined ||
      dto.amenities !== undefined ||
      dto.contract_duration_months !== undefined ||
      dto.mortgage_available !== undefined ||
      dto.photos_to_delete?.length ||
      dto.videos_to_delete?.length ||
      files?.new_photos?.length ||
      files?.new_videos?.length;

    if (hasContentChanges) {
      typedProperty.status = EnumPropertyStatus.PENDING;
    }

    // Mark nested fields as modified
    typedProperty.markModified('title');
    typedProperty.markModified('description');
    typedProperty.markModified('address');
    if (dto.location_lat !== undefined || dto.location_lng !== undefined) {
      typedProperty.markModified('location');
    }

    const saved = await typedProperty.save();
    this.searchCache.invalidate();
    return saved;
  }
}
