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
import { EnumDealType } from './enums/deal-type.enum';
import { SortOption } from './enums/sort-option.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { CurrencyCode, DEFAULT_CURRENCY } from 'src/common/currencies';
import { FindAllPropertiesDto } from './dto/find-all-properties.dto';
import { MessageService } from '../message/message.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { EnumPropertyStatus } from './enums/property-status.enum';
import { Seller, SellerDocument } from '../seller/schemas/seller.schema';
import { TagService } from '../tag/tag.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { ApartmentRentDocument } from './schemas/categories/apartment-rent.schema';
import { ApartmentSaleDocument } from './schemas/categories/apartment-sale.schema';
import { CommercialRentDocument } from './schemas/categories/commercial-rent.schema';
import { CommercialSaleDocument } from './schemas/categories/commercial-sale.schema';
import { LandSaleDocument } from './schemas/categories/land-sale.schema';
import { LandRentDocument } from './schemas/categories/land-rent.schema';
import { GarageSaleDocument } from './schemas/categories/garage-sale.schema';
import { GarageRentDocument } from './schemas/categories/garage-rent.schema';
import { HovliSaleDocument } from './schemas/categories/hovli-sale.schema';
import { HovliRentDocument } from './schemas/categories/hovli-rent.schema';
import { PropertySearchCache } from './property-search.cache';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';

type CurrencyRateMap = Partial<Record<CurrencyCode, number>>;

interface PriceConversionContext {
  targetCurrency: CurrencyCode;
  rates: CurrencyRateMap;
}

@Injectable()
export class PropertyService {
  /**
   * PremiumService — lazy setter orqali inject qilinadi (circular dep'dan
   * himoya). PremiumModule onApplicationBootstrap'da PropertyService'ga set
   * qiladi. Agar set qilinmagan bo'lsa, limit tekshiruvi o'tkazilmaydi.
   */
  premiumService?: {
    assertCanCreateProperty: (
      userId: string,
      currentCount: number,
    ) => Promise<void>;
  };

  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_RENT)
    private readonly apartmentRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_SALE)
    private readonly apartmentSaleModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.COMMERCIAL_RENT)
    private readonly commercialRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.COMMERCIAL_SALE)
    private readonly commercialSaleModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.LAND_SALE)
    private readonly landSaleModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.LAND_RENT)
    private readonly landRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.GARAGE_SALE)
    private readonly garageSaleModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.GARAGE_RENT)
    private readonly garageRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.HOVLI_SALE)
    private readonly hovliSaleModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.HOVLI_RENT)
    private readonly hovliRentModel: Model<PropertyDocument>,
    @InjectModel(Seller.name)
    private readonly sellerModel: Model<SellerDocument>,
    private readonly fileService: FileService,
    private readonly openaiService: OpenaiService,
    private readonly messageService: MessageService,
    private readonly tagService: TagService,
    private readonly searchCache: PropertySearchCache,
    private readonly exchangeRateService: ExchangeRateService,
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

    // Premium / property limit tekshiruvi: bepul user free_property_limit
    // tagacha e'lon qo'sha oladi. Premium bo'lsa cheksiz.
    // PremiumService circular bo'lmasligi uchun setter orqali inject qilingan.
    if (this.premiumService) {
      const currentCount = await this.propertyModel
        .countDocuments({ author: new Types.ObjectId(author) })
        .exec();
      await this.premiumService.assertCanCreateProperty(author, currentCount);
    }

    let Model: Model<PropertyDocument>;

    switch (category) {
      case EnumPropertyCategory.APARTMENT_RENT:
        Model = this.apartmentRentModel;
        break;
      case EnumPropertyCategory.APARTMENT_SALE:
        Model = this.apartmentSaleModel;
        break;
      case EnumPropertyCategory.COMMERCIAL_RENT:
        Model = this.commercialRentModel;
        break;
      case EnumPropertyCategory.COMMERCIAL_SALE:
        Model = this.commercialSaleModel;
        break;
      case EnumPropertyCategory.LAND_SALE:
        Model = this.landSaleModel;
        break;
      case EnumPropertyCategory.LAND_RENT:
        Model = this.landRentModel;
        break;
      case EnumPropertyCategory.GARAGE_SALE:
        Model = this.garageSaleModel;
        break;
      case EnumPropertyCategory.GARAGE_RENT:
        Model = this.garageRentModel;
        break;
      case EnumPropertyCategory.HOVLI_SALE:
        Model = this.hovliSaleModel;
        break;
      case EnumPropertyCategory.HOVLI_RENT:
        Model = this.hovliRentModel;
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
          (bedrooms && bedrooms >= 1 ? ` (xonalar soni: ${bedrooms})` : ''),
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
      tag,
      is_premium,
      is_new,
      rating,
      filterCategory,
      dealType,
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
    const priceCurrency = currency ?? DEFAULT_CURRENCY;
    const needsPriceConversion =
      minPrice !== undefined ||
      maxPrice !== undefined ||
      sort === SortOption.PRICE_ASC ||
      sort === SortOption.PRICE_DESC;
    const priceConversion = needsPriceConversion
      ? await this.getPriceConversionContext(priceCurrency)
      : undefined;

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
      tag,
      filterCategory,
      dealType,
      bathrooms,
      bedrooms,
      sw_lng,
      sw_lat,
      ne_lng,
      ne_lat,
      lat,
      lng,
      radius,
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
        priceConversion,
        minPrice,
        maxPrice,
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
      priceCurrency,
      minPrice,
      maxPrice,
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
      priceConversion,
      minPrice,
      maxPrice,
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
    tag,
    filterCategory,
    dealType,
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
    tag?: string;
    filterCategory?: EnumPropertyCategoryFilter;
    dealType?: EnumDealType;
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
    } else if (dealType === EnumDealType.RENT) {
      match.category = {
        $in: [
          EnumPropertyCategory.APARTMENT_RENT,
          EnumPropertyCategory.COMMERCIAL_RENT,
          EnumPropertyCategory.LAND_RENT,
          EnumPropertyCategory.GARAGE_RENT,
          EnumPropertyCategory.HOVLI_RENT,
        ],
      };
    } else if (dealType === EnumDealType.SALE) {
      match.category = {
        $in: [
          EnumPropertyCategory.APARTMENT_SALE,
          EnumPropertyCategory.COMMERCIAL_SALE,
          EnumPropertyCategory.LAND_SALE,
          EnumPropertyCategory.GARAGE_SALE,
          EnumPropertyCategory.HOVLI_SALE,
        ],
      };
    } else if (filterCategory === EnumPropertyCategoryFilter.APARTMENT) {
      match.category = {
        $in: [
          EnumPropertyCategory.APARTMENT_SALE,
          EnumPropertyCategory.APARTMENT_RENT,
        ],
      };
    } else if (filterCategory === EnumPropertyCategoryFilter.COMMERCIAL) {
      match.category = {
        $in: [
          EnumPropertyCategory.COMMERCIAL_SALE,
          EnumPropertyCategory.COMMERCIAL_RENT,
        ],
      };
    } else if (filterCategory === EnumPropertyCategoryFilter.LAND) {
      match.category = {
        $in: [
          EnumPropertyCategory.LAND_SALE,
          EnumPropertyCategory.LAND_RENT,
        ],
      };
    } else if (filterCategory === EnumPropertyCategoryFilter.GARAGE) {
      match.category = {
        $in: [
          EnumPropertyCategory.GARAGE_SALE,
          EnumPropertyCategory.GARAGE_RENT,
        ],
      };
    } else if (filterCategory === EnumPropertyCategoryFilter.HOVLI) {
      match.category = {
        $in: [
          EnumPropertyCategory.HOVLI_SALE,
          EnumPropertyCategory.HOVLI_RENT,
        ],
      };
    }

    if (is_premium !== undefined) match.is_premium = is_premium;
    if (is_new) {
      match.createdAt = { $gte: new Date(Date.now() - 604_800_000) };
    }
    if (rating !== undefined) match.rating = { $gte: rating };

    // Tag (location keyword) ham, free-text search ham bitta $text index'da
    // qidiriladi — Mongo $text bitta query'da faqat bir marta ishlatiladi,
    // shu sabab ularni bo'shliq orqali birlashtiramiz.
    const textQuery = [search?.trim(), tag?.trim()]
      .filter((part): part is string => Boolean(part && part.length > 0))
      .join(' ');
    if (textQuery) match.$text = { $search: textQuery };

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
    priceConversion,
    minPrice,
    maxPrice,
  }: {
    match: FilterQuery<PropertyDocument>;
    limit: number;
    language: EnumLanguage;
    category?: string;
    isMapView?: boolean;
    priceConversion?: PriceConversionContext;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const pipeline: any[] = [];

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    this.appendPriceConversionStages(
      pipeline,
      priceConversion,
      minPrice,
      maxPrice,
    );

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

  private getSortStage(
    sort?: SortOption,
    priceConversion?: PriceConversionContext,
  ): Record<string, 1 | -1> {
    switch (sort) {
      case SortOption.OLDEST:
        return { createdAt: 1 };
      case SortOption.PRICE_ASC:
        return {
          [priceConversion ? 'convertedPrice' : 'price']: 1,
          createdAt: -1,
        };
      case SortOption.PRICE_DESC:
        return {
          [priceConversion ? 'convertedPrice' : 'price']: -1,
          createdAt: -1,
        };
      case SortOption.RATING:
        return { rating: -1, createdAt: -1 };
      case SortOption.POPULAR:
        return { liked: -1, saved: -1, createdAt: -1 };
      case SortOption.NEWEST:
      default:
        return { createdAt: -1 };
    }
  }

  private async getPriceConversionContext(
    targetCurrency: CurrencyCode,
  ): Promise<PriceConversionContext> {
    const exchangeRate = await this.exchangeRateService.get();
    return {
      targetCurrency,
      rates: { ...exchangeRate.rates },
    };
  }

  private getConvertedPriceExpression(context: PriceConversionContext) {
    const targetRate = context.rates[context.targetCurrency] ?? 1;
    const branches = Object.values(CurrencyCode).map((code) => ({
      case: { $eq: ['$currency', code] },
      then: context.rates[code] ?? targetRate,
    }));

    return {
      $multiply: [
        '$price',
        {
          $divide: [
            targetRate,
            {
              $switch: {
                branches,
                default: targetRate,
              },
            },
          ],
        },
      ],
    };
  }

  private appendPriceConversionStages(
    pipeline: PipelineStage[],
    context?: PriceConversionContext,
    minPrice?: number,
    maxPrice?: number,
  ) {
    if (!context) return;

    pipeline.push({
      $addFields: {
        convertedPrice: this.getConvertedPriceExpression(context),
      },
    } as PipelineStage);

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceMatch: { $gte?: number; $lte?: number } = {};
      if (minPrice !== undefined) priceMatch.$gte = minPrice;
      if (maxPrice !== undefined) priceMatch.$lte = maxPrice;
      pipeline.push({ $match: { convertedPrice: priceMatch } });
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
    priceConversion,
    minPrice,
    maxPrice,
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
    priceConversion?: PriceConversionContext;
    minPrice?: number;
    maxPrice?: number;
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
          ...(radius && radius > 0 ? { maxDistance: radius * 1000 } : {}),
          query: geoMatch,
        },
      });
      this.appendPriceConversionStages(
        pipeline,
        priceConversion,
        minPrice,
        maxPrice,
      );
      pipeline.push(
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { ...projection, distance_m: 1 } },
      );
    } else {
      if (Object.keys(match).length > 0) {
        pipeline.push({ $match: match });
      }
      this.appendPriceConversionStages(
        pipeline,
        priceConversion,
        minPrice,
        maxPrice,
      );
      pipeline.push(
        { $sort: this.getSortStage(sort, priceConversion) },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: projection },
      );
    }

    if (page === 1) {
      const countFilter = useGeoNear
        ? this.countFilterForDistance(match, lat, lng, radius)
        : match;
      const [properties, totalItems] = await Promise.all([
        this.propertyModel.aggregate(pipeline).exec(),
        priceConversion
          ? this.getAggregateCount(
              countFilter,
              priceConversion,
              minPrice,
              maxPrice,
            )
          : this.getCount(countFilter),
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

  private async getAggregateCount(
    match: FilterQuery<PropertyDocument>,
    priceConversion: PriceConversionContext,
    minPrice?: number,
    maxPrice?: number,
  ): Promise<number> {
    const pipeline: PipelineStage[] = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    this.appendPriceConversionStages(
      pipeline,
      priceConversion,
      minPrice,
      maxPrice,
    );
    pipeline.push({ $count: 'totalItems' });

    const [result] = await this.propertyModel.aggregate(pipeline).exec();
    return result?.totalItems ?? 0;
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
      bedrooms: 1,
      bathrooms: 1,
      area: 1,
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
      COMMERCIAL_RENT: {
        floor_level: 1,
        total_floors: 1,
        area: 1,
        furnished: 1,
        repair_type: 1,
        heating: 1,
        amenities: 1,
        contract_duration_months: 1,
      },
      COMMERCIAL_SALE: {
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

  async findById({
    id,
    language,
    userId,
  }: {
    id: string;
    language?: EnumLanguage;
    userId?: string;
  }) {
    const property = await this.propertyModel
      .findById(id)
      .populate('author')
      .lean()
      .exec();
    if (!property) {
      throw new NotFoundException('Property not found!');
    }

    const isOwner =
      userId && property.author?._id?.toString() === userId.toString();
    if (
      !isOwner &&
      (property.is_archived || property.status !== EnumPropertyStatus.APPROVED)
    ) {
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

  /**
   * Premium upgrade boshlanishidan oldin egasi to'g'ri ekanini tekshiradi.
   * Premium yoqilgan e'lonni qayta to'lash mumkin emas (muddat tugashini kuting).
   */
  async ensureOwnedAndPremiumEligible({
    propertyId,
    userId,
  }: {
    propertyId: string;
    userId: string;
  }) {
    const property = await this.propertyModel.findById(propertyId);
    if (!property) throw new NotFoundException('Property not found!');
    if (property.author.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only upgrade your own property.');
    }
    if (
      property.is_premium &&
      property.is_premium_until &&
      property.is_premium_until.getTime() > Date.now()
    ) {
      throw new BadRequestException(
        `Bu e'lon allaqachon premium (${property.is_premium_until.toISOString()} gacha)`,
      );
    }
    return property;
  }

  /**
   * Admin approve qilganda chaqiriladi: e'lonni premium qiladi va
   * muddati tugash sanasini o'rnatadi.
   *
   * Joriy premium muddati hali tugamagan bo'lsa, davomidan davom etadi
   * (qaytma extend). Aks holda hozirgi vaqtdan boshlanadi.
   */
  async markPremium({
    propertyId,
    durationDays,
  }: {
    propertyId: string;
    durationDays: number;
  }) {
    const property = await this.propertyModel.findById(propertyId);
    if (!property) throw new NotFoundException('Property not found!');

    const now = Date.now();
    const base =
      property.is_premium_until && property.is_premium_until.getTime() > now
        ? property.is_premium_until.getTime()
        : now;
    const newUntil = new Date(base + durationDays * 24 * 60 * 60 * 1000);

    property.is_premium = true;
    property.is_premium_until = newUntil;
    const saved = await property.save();
    this.searchCache.invalidate();
    return saved;
  }

  /**
   * Premium muddati tugagan barcha e'lonlarni topib `is_premium = false`
   * qiladi. Cron job kuniga 1 marta chaqiradi.
   *
   * @returns expire qilingan e'lonlar soni
   */
  async expirePremiums(): Promise<number> {
    const result = await this.propertyModel.updateMany(
      {
        is_premium: true,
        is_premium_until: { $ne: null, $lte: new Date() },
      },
      {
        $set: { is_premium: false },
      },
    );
    if (result.modifiedCount > 0) {
      this.searchCache.invalidate();
    }
    return result.modifiedCount;
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
    let typedProperty:
      | ApartmentRentDocument
      | ApartmentSaleDocument
      | CommercialRentDocument
      | CommercialSaleDocument
      | LandSaleDocument
      | LandRentDocument
      | GarageSaleDocument
      | GarageRentDocument
      | HovliSaleDocument
      | HovliRentDocument;

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
      case EnumPropertyCategory.COMMERCIAL_RENT:
        typedProperty = (await this.commercialRentModel
          .findById(id)
          .exec()) as unknown as CommercialRentDocument;
        break;
      case EnumPropertyCategory.COMMERCIAL_SALE:
        typedProperty = (await this.commercialSaleModel
          .findById(id)
          .exec()) as unknown as CommercialSaleDocument;
        break;
      case EnumPropertyCategory.LAND_SALE:
        typedProperty = (await this.landSaleModel
          .findById(id)
          .exec()) as unknown as LandSaleDocument;
        break;
      case EnumPropertyCategory.LAND_RENT:
        typedProperty = (await this.landRentModel
          .findById(id)
          .exec()) as unknown as LandRentDocument; // eslint-disable-line
        break;
      case EnumPropertyCategory.GARAGE_SALE:
        typedProperty = (await this.garageSaleModel
          .findById(id)
          .exec()) as unknown as GarageSaleDocument; // eslint-disable-line
        break;
      case EnumPropertyCategory.GARAGE_RENT:
        typedProperty = (await this.garageRentModel
          .findById(id)
          .exec()) as unknown as GarageRentDocument; // eslint-disable-line
        break;
      case EnumPropertyCategory.HOVLI_SALE:
        typedProperty = (await this.hovliSaleModel
          .findById(id)
          .exec()) as unknown as HovliSaleDocument; // eslint-disable-line
        break;
      case EnumPropertyCategory.HOVLI_RENT:
        typedProperty = (await this.hovliRentModel
          .findById(id)
          .exec()) as unknown as HovliRentDocument; // eslint-disable-line
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
    const isApartment =
      category === EnumPropertyCategory.APARTMENT_RENT ||
      category === EnumPropertyCategory.APARTMENT_SALE;
    if (isApartment) {
      const apt = typedProperty as ApartmentRentDocument | ApartmentSaleDocument;
      if (dto.bedrooms !== undefined) apt.bedrooms = dto.bedrooms;
      if (dto.bathrooms !== undefined) apt.bathrooms = dto.bathrooms;
    }
    const tp = typedProperty as any;
    if (dto.floor_level !== undefined) tp.floor_level = dto.floor_level;
    if (dto.total_floors !== undefined) tp.total_floors = dto.total_floors;
    if (dto.area !== undefined) tp.area = dto.area;
    if (dto.furnished !== undefined) tp.furnished = dto.furnished;
    if (dto.repair_type !== undefined) tp.repair_type = dto.repair_type;
    if (dto.heating !== undefined) tp.heating = dto.heating;
    if (dto.amenities !== undefined) tp.amenities = dto.amenities;

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
    } else if (typedProperty.category === EnumPropertyCategory.COMMERCIAL_RENT) {
      if (dto.contract_duration_months !== undefined) {
        (typedProperty as CommercialRentDocument).contract_duration_months =
          dto.contract_duration_months;
      }
    } else if (typedProperty.category === EnumPropertyCategory.COMMERCIAL_SALE) {
      if (dto.mortgage_available !== undefined) {
        (typedProperty as CommercialSaleDocument).mortgage_available =
          dto.mortgage_available;
      }
    } else if (
      typedProperty.category === EnumPropertyCategory.LAND_SALE ||
      typedProperty.category === EnumPropertyCategory.GARAGE_SALE ||
      typedProperty.category === EnumPropertyCategory.HOVLI_SALE
    ) {
      if (dto.mortgage_available !== undefined) tp.mortgage_available = dto.mortgage_available;
      if ((dto as any).land_type !== undefined) tp.land_type = (dto as any).land_type;
      if ((dto as any).is_electricity !== undefined) tp.is_electricity = (dto as any).is_electricity;
      if ((dto as any).is_water !== undefined) tp.is_water = (dto as any).is_water;
      if ((dto as any).is_gas !== undefined) tp.is_gas = (dto as any).is_gas;
      if ((dto as any).road_access !== undefined) tp.road_access = (dto as any).road_access;
      if ((dto as any).has_pit !== undefined) tp.has_pit = (dto as any).has_pit;
      if ((dto as any).has_electricity !== undefined) tp.has_electricity = (dto as any).has_electricity;
      if ((dto as any).is_heated !== undefined) tp.is_heated = (dto as any).is_heated;
      if ((dto as any).rooms !== undefined) tp.rooms = (dto as any).rooms;
      if ((dto as any).land_area !== undefined) tp.land_area = (dto as any).land_area;
      if ((dto as any).floors !== undefined) tp.floors = (dto as any).floors;
    } else if (
      typedProperty.category === EnumPropertyCategory.LAND_RENT ||
      typedProperty.category === EnumPropertyCategory.GARAGE_RENT ||
      typedProperty.category === EnumPropertyCategory.HOVLI_RENT
    ) {
      if ((dto as any).land_type !== undefined) tp.land_type = (dto as any).land_type;
      if ((dto as any).is_electricity !== undefined) tp.is_electricity = (dto as any).is_electricity;
      if ((dto as any).is_water !== undefined) tp.is_water = (dto as any).is_water;
      if ((dto as any).is_gas !== undefined) tp.is_gas = (dto as any).is_gas;
      if ((dto as any).road_access !== undefined) tp.road_access = (dto as any).road_access;
      if ((dto as any).has_pit !== undefined) tp.has_pit = (dto as any).has_pit;
      if ((dto as any).has_electricity !== undefined) tp.has_electricity = (dto as any).has_electricity;
      if ((dto as any).is_heated !== undefined) tp.is_heated = (dto as any).is_heated;
      if ((dto as any).rooms !== undefined) tp.rooms = (dto as any).rooms;
      if ((dto as any).land_area !== undefined) tp.land_area = (dto as any).land_area;
      if ((dto as any).floors !== undefined) tp.floors = (dto as any).floors;
      if (dto.contract_duration_months !== undefined) tp.contract_duration_months = dto.contract_duration_months;
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
