import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EnumLanguage } from 'src/enums/language.enum';
import { Save, SaveDocument } from '../schemas/save.schema';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';

@Injectable()
export class SaveService {
  constructor(
    @InjectModel(Save.name) private readonly saveModel: Model<SaveDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async saveProperty({
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

    // ✅ Bir query bilan ham save, ham property tekshirish
    const [existingSave, property] = await Promise.all([
      this.saveModel.findOne({
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
        "Siz o'zingizga tegishli property ni saqlay olmaysiz!",
      );
    }

    const isUnsave = !!existingSave;
    const action = isUnsave ? 'unsave' : 'save';
    const saveIncrement = isUnsave ? -1 : 1;

    // ✅ Parallel operatsiyalar
    const [saveResult] = await Promise.all([
      isUnsave
        ? this.saveModel.findByIdAndDelete(existingSave._id)
        : this.saveModel.create({
            user: userObjectId,
            property: propertyObjectId,
          }),
      this.propertyModel.findByIdAndUpdate(
        propertyObjectId,
        { $inc: { saved: saveIncrement } },
        { new: false }, // yangi qiymat kerak emas
      ),
    ]);

    // ✅ Aggregation bilan bir query da property + author + related fields
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
      _id: saveResult?._id,
      user: isUnsave ? existingSave.user : saveResult?.user,
      property: propertyWithAuthor,
      action,
    };
  }

  async findMySaves(user: string, language: EnumLanguage = EnumLanguage.UZ) {
    const userObjectId = new Types.ObjectId(user);

    // ✅ Optimallashtirilgan aggregation
    return this.saveModel.aggregate([
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

  // ✅ Bonus: Bulk save status tekshirish
  async checkSaveStatus(
    userId: string,
    propertyIds: string[],
  ): Promise<Record<string, boolean>> {
    const userObjectId = new Types.ObjectId(userId);
    const propertyObjectIds = propertyIds.map((id) => new Types.ObjectId(id));

    const saves = await this.saveModel.find(
      {
        user: userObjectId,
        property: { $in: propertyObjectIds },
      },
      'property',
    );

    return propertyObjectIds.reduce(
      (acc, id) => {
        acc[id.toString()] = saves.some(
          (save) => save.property.toString() === id.toString(),
        );
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }
}
