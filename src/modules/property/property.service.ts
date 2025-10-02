import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Property, PropertyDocument } from './property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { FileService } from '../file/file.service';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';

interface CreatePropertyWithFilesDto extends CreatePropertyDto {
  author: string;
  files: {
    banner?: Express.Multer.File[];
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
  search?: string;
  price_type?: EnumPropertyPriceType;
  construction_status?: EnumConstructionStatus;
  is_premium?: boolean;
  is_verified?: boolean;
  is_new?: boolean;
  is_guest_choice?: boolean;
  rating?: number;
  radius?: number;
}

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name) private model: Model<PropertyDocument>,
    private readonly fileService: FileService,
  ) {}

  async createProperty(dto: CreatePropertyWithFilesDto) {
    const { files, author, ...propertyData } = dto;

    const newProperty = await this.model.create({
      ...propertyData,
      author,
    });

    if (files) {
      await this.fileService.uploadPropertyFiles(
        newProperty._id as string,
        files,
      );
    }
    const property = await this.model
      .findById(newProperty._id)
      .populate('videos')
      .populate('photos')
      .populate('region')
      .populate('district')
      .lean();
    return property;
  }

  async findAll({
    page = 1,
    limit = 20,
    region,
    district,
    coordinates,
    category,
    search,
    price_type,
    construction_status,
    is_premium,
    is_verified,
    is_new,
    is_guest_choice,
    rating,
    radius = 10000,
  }: FindAllParams) {
    // Limitni cheklash
    limit = Math.min(limit, 100);
    const skip = (page - 1) * limit;

    // Filter obyekti uchun aniq tip
    const filter: FilterQuery<PropertyDocument> = {};

    // Search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    // Basic filters
    if (region) filter.region = region;
    if (district) filter.district = district;
    if (category) filter.category = category;
    if (price_type) filter.price_type = price_type;
    if (construction_status) filter.construction_status = construction_status;
    if (is_premium !== undefined) filter.is_premium = is_premium;
    if (is_verified !== undefined) filter.is_verified = is_verified;
    if (is_new !== undefined) filter.is_new = is_new;
    if (is_guest_choice !== undefined) filter.is_guest_choice = is_guest_choice;
    if (rating !== undefined) filter.rating = { $gte: rating };

    // Geolocation
    if (coordinates && coordinates.length === 2) {
      filter['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates,
          },
          $maxDistance: radius,
        },
      };
    }

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
      .populate('videos')
      .populate('photos')
      .populate('region')
      .populate('district')
      .populate('author', '-password')
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
