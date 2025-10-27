import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from '../property/property.schema';

@Injectable()
export class StatisticService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async getSellerPropertyStatistics(sellerId: string) {
    const properties = await this.propertyModel.find({ author: sellerId });

    const totalProperties = properties.length;
    const totalLikes = properties.reduce((sum, p) => sum + p.liked, 0);
    const totalSaved = properties.reduce((sum, p) => sum + p.saved, 0);

    const propertiesByCategory = properties.reduce((acc, property) => {
      acc[property.category] = (acc[property.category] || 0) + 1;
      return acc;
    }, {});

    const propertiesByPurpose = properties.reduce((acc, property) => {
      acc[property.purpose] = (acc[property.purpose] || 0) + 1;
      return acc;
    }, {});

    return {
      totalProperties,
      totalLikes,
      totalSaved,
      propertiesByCategory,
      propertiesByPurpose,
    };
  }
}
