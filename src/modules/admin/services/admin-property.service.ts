import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';
import { FindPropertiesDto } from '../dto/find-properties.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PropertySearchCache } from 'src/modules/property/property-search.cache';
import { FileService } from 'src/modules/file/file.service';
import { EnumFilesFolder } from 'src/modules/file/enums/files-folder.enum';
import { PropertyService } from 'src/modules/property/property.service';

/**
 * Property discriminator schema'lariga (apartment/commercial/land/garage/
 * hovli, sale/rent) tarqalgan ixtiyoriy maydonlar. `propertyModel` orqali
 * o'qilgan hujjat Mongoose tomonidan o'z category'siga mos discriminator
 * schema bilan hydratsiya qilinadi — shu sabab mos kelmagan maydonni
 * (masalan LAND_SALE hujjatiga 'bedrooms') yozishga urinish xavfsiz: u
 * hujjat sxemasida yo'q path bo'lgani uchun `save()` uni e'tiborsiz
 * qoldiradi, boshqa kategoriya ma'lumotlari bilan aralashib qolmaydi.
 */
const CATEGORY_SPECIFIC_FIELDS = [
  'bedrooms',
  'bathrooms',
  'floor_level',
  'total_floors',
  'area',
  'rooms',
  'land_area',
  'floors',
  'contract_duration_months',
  'furnished',
  'mortgage_available',
  'has_pit',
  'has_electricity',
  'is_heated',
  'is_electricity',
  'is_water',
  'is_gas',
  'road_access',
  'repair_type',
  'heating',
  'land_type',
  'amenities',
  'rental_target',
] as const satisfies readonly (keyof UpdatePropertyDto)[];

@Injectable()
export class AdminPropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    private readonly searchCache: PropertySearchCache,
    private readonly fileService: FileService,
    private readonly propertyService: PropertyService,
  ) {}

  async findAll(dto: FindPropertiesDto) {
    const { page = 1, limit = 10, search, status, category, is_archived } = dto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<PropertyDocument> = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (is_archived !== undefined) {
      filter.is_archived = is_archived;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { 'title.uz': searchRegex },
        { 'title.ru': searchRegex },
        { 'title.en': searchRegex },
        { 'description.uz': searchRegex },
        { 'description.ru': searchRegex },
        { 'description.en': searchRegex },
        { 'address.uz': searchRegex },
        { 'address.ru': searchRegex },
        { 'address.en': searchRegex },
      ];
    }

    const properties = await this.propertyModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('author', 'first_name last_name email phone')
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.propertyModel.countDocuments(filter);
    const hasMore = page * limit < total;

    return {
      properties,
      total,
      page,
      limit,
      hasMore,
    };
  }

  async findByUser(userId: string) {
    const properties = await this.propertyModel
      .find({ author: userId })
      .populate('author', 'first_name last_name email phone')
      .exec();
    return properties;
  }

  async findOne(id: string) {
    const property = await this.propertyModel
      .findById(id)
      .populate('author')
      .exec();

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async update(propertyId: string, dto: UpdatePropertyDto) {
    const property = await this.propertyModel.findById(propertyId);

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    if (dto.title !== undefined) property.title = dto.title;
    if (dto.description !== undefined) property.description = dto.description;
    if (dto.address !== undefined) property.address = dto.address;
    if (dto.category !== undefined) property.category = dto.category;
    if (dto.location !== undefined) property.location = dto.location;
    if (dto.currency !== undefined) property.currency = dto.currency;
    if (dto.price !== undefined) property.price = dto.price;
    if (dto.is_premium !== undefined) property.is_premium = dto.is_premium;
    if (dto.is_archived !== undefined) property.is_archived = dto.is_archived;
    if (dto.photos !== undefined) property.photos = dto.photos;
    if (dto.videos !== undefined) property.videos = dto.videos;

    const mutableProperty = property as unknown as Record<string, unknown>;
    for (const key of CATEGORY_SPECIFIC_FIELDS) {
      const value = dto[key];
      if (value !== undefined) mutableProperty[key] = value;
    }

    const saved = await property.save();
    this.searchCache.invalidate();

    // Status o'zgarishi alohida delegatsiya qilinadi — shu yerda
    // rejectionNote saqlanadi va foydalanuvchiga notification ketadi.
    if (dto.status !== undefined) {
      return this.propertyService.updateStatus({
        id: propertyId,
        status: dto.status,
        note: dto.rejectionNote,
      });
    }

    return saved;
  }

  async addPhotos(id: string, files: Express.Multer.File[]) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    if (files.length > 0) {
      const urls = await this.fileService.saveFiles({
        files,
        folder: EnumFilesFolder.PHOTOS,
      });
      property.photos = [...(property.photos ?? []), ...urls];
      await property.save();
      this.searchCache.invalidate();
    }

    return property;
  }

  async removePhoto(id: string, url: string) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    if (!property.photos?.includes(url)) {
      throw new BadRequestException("Bu rasm ushbu e'londa topilmadi");
    }

    await this.fileService.deleteFile(url);
    property.photos = property.photos.filter((p) => p !== url);
    await property.save();
    this.searchCache.invalidate();

    return property;
  }

  async delete(id: string) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    const photos: string[] = property.photos ?? [];
    for (const photo of photos) {
      await this.fileService.deleteFile(photo).catch(() => null);
    }

    await this.propertyModel.findByIdAndDelete(id);
    this.searchCache.invalidate();
    return { deleted: true, id };
  }
}
