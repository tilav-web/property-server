import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EnumLanguage } from 'src/enums/language.enum';
import {
  Inquiry,
  InquiryDocument,
  EnumInquiryStatus,
} from '../schemas/inquiry.schema';
import {
  InquiryResponse,
  InquiryResponseDocument,
} from '../schemas/inquiry-response.schema';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';

@Injectable()
export class InquiryService {
  constructor(
    @InjectModel(Inquiry.name) private inquiryModel: Model<InquiryDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(InquiryResponse.name)
    private inquiryResponseModel: Model<InquiryResponseDocument>,
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
        {
          $lookup: {
            from: 'inquiryresponses',
            localField: '_id',
            foreignField: 'inquiry',
            as: 'response',
          },
        },
        { $unwind: '$user' },
        { $unwind: '$property' },
        {
          $unwind: {
            path: '$response',
            preserveNullAndEmptyArrays: true,
          },
        },
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
            response: {
              _id: '$response._id',
              status: '$response.status',
              description: '$response.description',
            },
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .exec();

    return inquiries;
  }

  async updateStatus(inquiryId: string, status: EnumInquiryStatus) {
    const inquiry = await this.inquiryModel.findById(inquiryId);
    if (!inquiry) {
      throw new NotFoundException('So‘rov topilmadi');
    }
    inquiry.status = status;
    return inquiry.save();
  }

  async findMyInquiryResponses(userId: string, language: EnumLanguage) {
    const inquiryResponses = await this.inquiryResponseModel
      .aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'inquiries',
            localField: 'inquiry',
            foreignField: '_id',
            as: 'inquiry',
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
        {
          $lookup: {
            from: 'sellers',
            localField: 'seller',
            foreignField: '_id',
            as: 'seller',
          },
        },
        { $unwind: { path: '$inquiry', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'seller.user',
            foreignField: '_id',
            as: 'seller_user',
          },
        },
        {
          $unwind: { path: '$seller_user', preserveNullAndEmptyArrays: true },
        },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            _id: 1,
            status: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            user: 1,
            inquiry: {
              _id: '$inquiry._id',
              type: '$inquiry.type',
              comment: {
                $ifNull: [
                  `$inquiry.comment.${language}`,
                  '$inquiry.comment.uz',
                ],
              },
            },
            property: {
              _id: '$property._id',
              title: {
                $ifNull: [`$property.title.${language}`, '$property.title.uz'],
              },
              photos: '$property.photos',
            },
            seller: {
              _id: '$seller._id',
              user: {
                _id: '$seller_user._id',
                first_name: '$seller_user.first_name',
                last_name: '$seller_user.last_name',
                avatar: '$seller_user.avatar',
              },
            },
          },
        },
      ])
      .exec();

    return inquiryResponses;
  }
}
