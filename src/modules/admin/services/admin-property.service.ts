import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';
import {
  Seller,
  SellerDocument,
} from 'src/modules/seller/schemas/seller.schema';
import { FindPropertiesDto } from '../dto/find-properties.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';

@Injectable()
export class AdminPropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
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

  async findBySeller(sellerId: string) {
    const seller = await this.sellerModel.findById(sellerId);
    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    const properties = await this.propertyModel
      .find({ author: seller.user })
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
    if (dto.status !== undefined) property.status = dto.status;
    if (dto.is_archived !== undefined) property.is_archived = dto.is_archived;
    if (dto.photos !== undefined) property.photos = dto.photos;
    if (dto.videos !== undefined) property.videos = dto.videos;

    return property.save();
  }
}
