import { BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Property, PropertyDocument } from './property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { FileService } from '../file/file.service';
import { FileType } from '../file/file.schema';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';
import { MessageService } from '../message/message.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { NotFoundError } from 'rxjs';
import { EnumPropertyPurpose } from 'src/enums/property-purpose.enum';

// Define interfaces for better type safety
interface Location {
  type: 'Point';
  coordinates: [number, number];
}

interface CreatePropertyWithFilesDto extends CreatePropertyDto {
  author: string;
  files: {
    photos?: Express.Multer.File[];
    videos?: Express.Multer.File[];
  };
}

// Qo'shimcha tiplar uchun
export interface FindAllParams {
  page?: number;
  limit?: number;
  region?: string;
  district?: string;
  coordinates?: [number, number];
  category?: EnumPropertyCategory;
  purpose?: EnumPropertyPurpose;
  search?: string;
  price_type?: EnumPropertyPriceType;
  construction_status?: EnumConstructionStatus;
  is_premium?: boolean;
  is_verified?: boolean;
  is_new?: boolean;
  is_guest_choice?: boolean;
  rating?: number;
  radius?: number;
  sample?: boolean;
  userId?: string;
}

export class PropertyService {
  constructor(
    @InjectModel(Property.name) private model: Model<PropertyDocument>,
    private readonly fileService: FileService,
    private readonly messageService: MessageService,
  ) {}

  async createProperty(dto: CreatePropertyWithFilesDto): Promise<Property> {
    const { files, author, ...propertyData } = dto;

    let parsedLocation: Location | undefined = undefined;

    // Lokatsiyani validatsiya qilish
    if (propertyData.location) {
      try {
        parsedLocation = JSON.parse(propertyData.location) as Location;

        if (
          !parsedLocation ||
          parsedLocation.type !== 'Point' ||
          !Array.isArray(parsedLocation.coordinates) ||
          parsedLocation.coordinates.length !== 2 ||
          typeof parsedLocation.coordinates[0] !== 'number' ||
          typeof parsedLocation.coordinates[1] !== 'number'
        ) {
          throw new BadRequestException('Invalid location data');
        }
      } catch (error) {
        console.error(error);
        throw new BadRequestException('Invalid location JSON string');
      }
    }

    // Amenities validatsiyasi
    if (propertyData.amenities) {
      try {
        if (!Array.isArray(propertyData.amenities)) {
          throw new BadRequestException(
            'Invalid amenities data: must be an array',
          );
        }
      } catch (error) {
        console.error(error);
        throw new BadRequestException('Invalid amenities JSON string');
      }
    }

    const dataToCreate = {
      ...propertyData,
      location: parsedLocation,
      author,
    };

    // Yangi mulk yaratish
    const newProperty = await this.model.create(dataToCreate);

    // Fayllarni yuklash
    if (files && Object.keys(files).length > 0) {
      await this.fileService.uploadFiles(
        newProperty._id as string,
        FileType.PROPERTY,
        files,
      );
    }

    // Yaratilgan mulkni qaytarish
    const property = await this.model
      .findById(newProperty._id)
      .populate('videos')
      .populate('photos')
      .populate('region')
      .populate('district')
      .lean()
      .exec();

    if (!property) {
      throw new BadRequestException('Property not found');
    }

    return property;
  }

  async findAll({
    page = 1,
    limit = 20,
    region,
    district,
    coordinates,
    category,
    purpose,
    search,
    price_type,
    construction_status,
    is_premium,
    is_verified,
    is_new,
    is_guest_choice,
    rating,
    radius = 10000,
    sample = false,
  }: FindAllParams & { sample?: boolean }) {
    limit = Math.min(limit, 100);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<PropertyDocument> = {};

    if (search) {
      filter.$or = [
        { 'title.uz': { $regex: search, $options: 'i' } },
        { 'title.ru': { $regex: search, $options: 'i' } },
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'description.uz': { $regex: search, $options: 'i' } },
        { 'description.ru': { $regex: search, $options: 'i' } },
        { 'description.en': { $regex: search, $options: 'i' } },
        { 'address.uz': { $regex: search, $options: 'i' } },
        { 'address.ru': { $regex: search, $options: 'i' } },
        { 'address.en': { $regex: search, $options: 'i' } },
      ];
    }

    if (region) filter.region = region;
    if (district) filter.district = district;
    if (category) filter.category = category;
    if (purpose) filter.purpose = purpose;
    if (price_type) filter.price_type = price_type;
    if (construction_status) filter.construction_status = construction_status;
    if (is_premium !== undefined) filter.is_premium = is_premium;
    if (is_verified !== undefined) filter.is_verified = is_verified;
    if (is_new !== undefined) filter.is_new = is_new;
    if (is_guest_choice !== undefined) filter.is_guest_choice = is_guest_choice;
    if (rating !== undefined) filter.rating = { $gte: rating };

    if (coordinates && coordinates.length === 2) {
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [coordinates[0], coordinates[1]],
          },
          $maxDistance: radius,
        },
      };
    }

    if (sample) {
      const total = await this.model.countDocuments(filter).exec();
      const sampleSize = Math.min(limit, total);
      let properties: PropertyDocument[] = [];

      if (sampleSize > 0) {
        const randomSkip = Math.max(
          0,
          Math.floor(Math.random() * (total - sampleSize)),
        );
        properties = await this.model
          .find(filter)
          .skip(randomSkip)
          .limit(sampleSize)
          .populate('author', '-password')
          .populate('region')
          .populate('district')
          .populate('photos')
          .populate('videos')
          .lean()
          .exec();
      }

      return {
        properties,
        pagination: null,
      };
    } else {
      const sort = {
        is_premium: -1,
        is_new: -1,
        is_guest_choice: -1,
        createdAt: -1,
      } as const;

      const properties = await this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('author', '-password')
        .populate('region')
        .populate('district')
        .populate('photos')
        .populate('videos')
        .lean()
        .exec();

      const total = await this.model.countDocuments(filter).exec();
      const totalPages = Math.ceil(total / limit);

      return {
        properties,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }
  }

  async findById(id: string) {
    return this.model
      .findById(id)
      .populate('author', '-password')
      .populate('region')
      .populate('district')
      .populate('photos')
      .populate('videos')
      .lean()
      .exec();
  }

  async findMyProperties(author: string) {
    return this.model
      .find({ author })
      .populate('author', '-password')
      .populate('region')
      .populate('district')
      .populate('photos')
      .populate('videos')
      .lean()
      .exec();
  }

  async createMessage(dto: CreateMessageDto & { user: string }) {
    const property = await this.model.findById(dto.property);
    if (!property) throw new NotFoundError('Property not found');

    if (property.author.toString() === dto?.user?.toString())
      throw new BadRequestException(
        "O'zingizga tegishli mulkka habar yubora olmaysiz!",
      );

    const message = await this.messageService.create(dto);
    const allMessages = await this.messageService.findByProperty(dto.property);
    const avgRating =
      allMessages.reduce((sum, m) => sum + (m.rating || 0), 0) /
      allMessages.length;
    property.rating = avgRating;
    await property.save();

    await this.messageService.createMessageStatus({
      message: message?._id as string,
      seller: property?.author.toString(),
    });
    return message;
  }
}
