import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from '../schemas/like.schema';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/property.schema';

@Injectable()
export class LikeService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async likeProperty(userId: string, propertyId: string) {
    const like = await this.likeModel.findOne({
      user: userId,
      property: propertyId,
    });

    if (like) {
      await this.likeModel.findByIdAndDelete(like._id);
      const property = await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { like: -1 },
      });
      return property;
    } else {
      await this.likeModel.create({ user: userId, property: propertyId });
      const property = await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { like: 1 },
      });
      return property;
    }
  }

  async findMyLikes(userId: string): Promise<Property[]> {
    const likes = await this.likeModel
      .find({ user: userId })
      .populate({
        path: 'property',
        populate: [
          { path: 'author', select: '-password' },
          { path: 'region' },
          { path: 'district' },
          { path: 'photos' },
          { path: 'videos' },
        ],
      })
      .lean()
      .exec();
    return likes.map((like) => like.property as unknown as Property);
  }
}
