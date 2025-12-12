import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EnumLanguage } from 'src/enums/language.enum';
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

  async likeProperty({
    userId,
    propertyId,
    language = EnumLanguage.UZ,
  }: {
    userId: string;
    propertyId: string;
    language: EnumLanguage;
  }) {
    const userObjectId = new Types.ObjectId(userId);
    const propertyObjectId = new Types.ObjectId(propertyId);

    // ✅ Bir query bilan ham like, ham property tekshirish
    const [existingLike, property] = await Promise.all([
      this.likeModel.findOne({
        user: userObjectId,
        property: propertyObjectId,
      }),
      this.propertyModel.findById(propertyObjectId, 'author'),
    ]);

    if (!property) {
      throw new BadRequestException('Property topilmadi');
    }

    if (userId === property.author.toString()) {
      throw new BadRequestException(
        "Siz o'zingizga tegishli property ga like bosolmaysiz!",
      );
    }

    const isUnlike = !!existingLike;
    const action = isUnlike ? 'unlike' : 'like';
    const likeIncrement = isUnlike ? -1 : 1;

    // ✅ Parallel operatsiyalar
    const [likeResult] = await Promise.all([
      isUnlike
        ? this.likeModel.findByIdAndDelete(existingLike._id)
        : this.likeModel.create({
            user: userObjectId,
            property: propertyObjectId,
          }),
      this.propertyModel.findByIdAndUpdate(
        propertyObjectId,
        { $inc: { liked: likeIncrement } },
        { new: false }, // yangi qiymat kerak emas
      ),
    ]);

    // ✅ Aggregation bilan bir query da property + author
    const [propertyWithAuthor] = await this.propertyModel.aggregate([
      { $match: { _id: propertyObjectId } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            {
              $project: {
                password: 0, // parolni exclude qilish
              },
            },
          ],
        },
      },
      { $unwind: '$author' },
      {
        $project: {
          _id: 1,
          author: 1,
          title: { $ifNull: [`$title.${language}`, '$title.uz'] },
          description: {
            $ifNull: [`$description.${language}`, '$description.uz'],
          },
          address: { $ifNull: [`$address.${language}`, '$address.uz'] },
          category: 1,
          location: 1,
          currency: 1,
          price: 1,
          is_premium: 1,
          status: 1,
          is_archived: 1,
          rating: 1,
          liked: 1,
          saved: 1,
          photos: 1,
          videos: 1,
          createdAt: 1,
        },
      },
    ]);

    return {
      _id: likeResult?._id,
      user: isUnlike ? existingLike.user : likeResult?.user,
      property: propertyWithAuthor,
      action,
    };
  }

  async findMyLikes(user: string, language: EnumLanguage = EnumLanguage.UZ) {
    const userObjectId = new Types.ObjectId(user);

    // ✅ Optimallashtirilgan aggregation
    return this.likeModel.aggregate([
      { $match: { user: userObjectId } },
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'property',
        },
      },
      { $unwind: '$property' },
      {
        $lookup: {
          from: 'users',
          localField: 'property.author',
          foreignField: '_id',
          as: 'property.author',
          pipeline: [
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$property.author',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          user: 1,
          createdAt: 1,
          'property._id': 1,
          'property.author': 1,
          'property.title': {
            $ifNull: [`$property.title.${language}`, '$property.title.uz'],
          },
          'property.description': {
            $ifNull: [
              `$property.description.${language}`,
              '$property.description.uz',
            ],
          },
          'property.address': {
            $ifNull: [`$property.address.${language}`, '$property.address.uz'],
          },
          'property.category': 1,
          'property.location': 1,
          'property.currency': 1,
          'property.price': 1,
          'property.is_premium': 1,
          'property.status': 1,
          'property.is_archived': 1,
          'property.rating': 1,
          'property.liked': 1,
          'property.saved': 1,
          'property.photos': 1,
          'property.videos': 1,
          'property.createdAt': 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
  }

  // ✅ Bonus: Bulk like status tekshirish
  async checkLikeStatus(
    userId: string,
    propertyIds: string[],
  ): Promise<Record<string, boolean>> {
    const userObjectId = new Types.ObjectId(userId);
    const propertyObjectIds = propertyIds.map((id) => new Types.ObjectId(id));

    const likes = await this.likeModel.find(
      {
        user: userObjectId,
        property: { $in: propertyObjectIds },
      },
      'property',
    );

    return propertyObjectIds.reduce(
      (acc, id) => {
        acc[id.toString()] = likes.some(
          (like) => like.property.toString() === id.toString(),
        );
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }
}
