import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';
import { FindPropertiesDto } from '../dto/find-properties.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';

@Injectable()
export class AdminPropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
  ) {}

  async findAll(dto: FindPropertiesDto) {
    const { page = 1, limit = 10, search, status, category } = dto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<PropertyDocument> = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
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

  async update(propertyId: string, dto: UpdatePropertyDto) {
    const property = await this.propertyModel.findById(propertyId);

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    Object.assign(property, dto);

    return property.save();
  }
}
