import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inquiry, InquiryDocument } from '../../inquiry/schemas/inquiry.schema';

@Injectable()
export class AdminInquiryService {
  constructor(
    @InjectModel(Inquiry.name)
    private readonly inquiryModel: Model<InquiryDocument>,
  ) {}

  async findAll({
    page = 1,
    limit = 20,
    status,
    type,
  }: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }) {
    const skip = (page - 1) * limit;
    const match: Record<string, any> = {};
    if (status) match.status = status;
    if (type) match.type = type;

    const [items, total] = await Promise.all([
      this.inquiryModel
        .aggregate([
          { $match: match },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
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
              from: 'users',
              localField: 'seller',
              foreignField: '_id',
              as: 'seller',
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
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$response', preserveNullAndEmptyArrays: true } },
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
                avatar: '$user.avatar',
              },
              seller: {
                _id: '$seller._id',
                first_name: '$seller.first_name',
                last_name: '$seller.last_name',
                avatar: '$seller.avatar',
              },
              property: {
                _id: '$property._id',
                title: {
                  $ifNull: ['$property.title.uz', '$property.title.en'],
                },
                photos: { $slice: ['$property.photos', 1] },
              },
              response: {
                _id: '$response._id',
                status: '$response.status',
                description: '$response.description',
                createdAt: '$response.createdAt',
              },
            },
          },
        ])
        .exec(),
      this.inquiryModel.countDocuments(match),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    };
  }
}
