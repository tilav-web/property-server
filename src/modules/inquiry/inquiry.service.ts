import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inquiry, InquiryDocument } from './inquiry.schema';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import {
  Property,
  PropertyDocument,
} from '../property/schemas/property.schema';
import { EnumLanguage } from 'src/enums/language.enum';

@Injectable()
export class InquiryService {
  constructor(
    @InjectModel(Inquiry.name) private inquiryModel: Model<InquiryDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
  ) {}

  async create(dto: CreateInquiryDto & { user: string }): Promise<Inquiry> {
    // Check if property exists
    const property = await this.propertyModel.findById(dto.property);
    if (!property) {
      throw new NotFoundException('Mulk topilmadi');
    }

    // Check if the user is the owner of the property
    if (property.author.toString() === dto.user.toString()) {
      throw new ForbiddenException(
        "Siz o'zingizning mulkingizga so'rov yubora olmaysiz",
      );
    }

    const inquiry = new this.inquiryModel({
      ...dto,
      property: new Types.ObjectId(dto.property),
      seller: property.author,
    });
    return inquiry.save();
  }

  async findAllForSeller({
    userId,
    language,
  }: {
    userId: string;
    language: EnumLanguage;
  }) {
    const inquiries = await this.inquiryModel
      .aggregate([
        { $match: { seller: new Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'property',
          },
        },
        { $unwind: '$user' },
        { $unwind: '$property' },
        {
          $addFields: {
            'property.title': `$property.title.${language}`,
          },
        },
        {
          $project: {
            _id: 1,
            type: 1,
            status: 1,
            offered_price: 1,
            rental_period: 1,
            comment: 1,
            createdAt: 1,
            updatedAt: 1,
            user: {
              _id: '$user._id',
              first_name: '$user.first_name',
              last_name: '$user.last_name',
              email: '$user.email',
              avatar: '$user.avatar',
            },
            property: {
              _id: '$property._id',
              title: '$property.title',
            },
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .exec();

    return inquiries;
  }
}
