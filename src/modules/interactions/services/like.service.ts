import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from '../schemas/like.schema';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';

@Injectable()
export class LikeService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async likeProperty(userId: string, propertyId: string) {
    const existingLike = await this.likeModel.findOne({
      user: userId,
      property: propertyId,
    });
    const property = await this.propertyModel.findById(propertyId);

    if (userId.toString() === property?.author.toString())
      throw new BadRequestException(
        "Siz o'zingaizga tegishlik property ga like bosolmaysiz!",
      );

    if (existingLike) {
      // 🔻 Unlike bo‘lsa
      const unLike = await this.likeModel.findByIdAndDelete(existingLike._id);

      await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { like: -1 },
      });

      // populate qilingan property
      const populatedProperty = await this.propertyModel
        .findById(propertyId)
        .populate('author', '-password')
        .populate('region')
        .populate('district')
        .populate('photos')
        .populate('videos')
        .lean();

      return {
        _id: unLike?._id,
        user: unLike?.user,
        property: populatedProperty,
        action: 'unlike',
      };
    } else {
      // 🔺 Like bo‘lsa
      const newLike = await this.likeModel.create({
        user: userId,
        property: propertyId,
      });

      await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { like: 1 },
      });

      // populate qilingan property
      const populatedProperty = await this.propertyModel
        .findById(propertyId)
        .populate('author', '-password')
        .populate('region')
        .populate('district')
        .populate('photos')
        .populate('videos')
        .lean();

      return {
        _id: newLike._id,
        user: newLike.user,
        property: populatedProperty,
        action: 'like',
      };
    }
  }

  async findMyLikes(userId: string) {
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
    return likes;
  }
}
