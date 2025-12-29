import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Property,
  PropertyDocument,
} from '../property/schemas/property.schema';
import { Inquiry, InquiryDocument } from '../inquiry/inquiry.schema';

@Injectable()
export class StatisticService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(Inquiry.name)
    private readonly inquiryModel: Model<InquiryDocument>,
  ) {}

  async getSellerDashboard(userId: string) {
    const properties = await this.propertyModel.find({ author: userId }).exec();
    const propertyIds = properties.map((p) => p._id);

    const totalProperties = properties.length;
    const totalLikes = properties.reduce((sum, p) => sum + p.liked, 0);
    const totalSaves = properties.reduce((sum, p) => sum + p.saved, 0);

    const totalInquiries = await this.inquiryModel
      .countDocuments({
        property: { $in: propertyIds },
      })
      .exec();

    return {
      totalProperties,
      totalLikes,
      totalSaves,
      totalInquiries,
    };
  }
}
