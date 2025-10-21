import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/property.schema';
import { Save, SaveDocument } from '../schemas/save.schema';

@Injectable()
export class SaveService {
  constructor(
    @InjectModel(Save.name) private readonly saveModel: Model<SaveDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async saveProperty(userId: string, propertyId: string) {
    const existingSave = await this.saveModel.findOne({
      user: userId,
      property: propertyId,
    });

    const property = await this.propertyModel.findById(propertyId);

    if (userId.toString() === property?.author.toString())
      throw new BadRequestException(
        "Siz o'zingaizga tegishlik property ni saqlay olmaysiz!",
      );

    if (existingSave) {
      // 🔻 Unsave bo‘lsa
      const unSave = await this.saveModel.findByIdAndDelete(existingSave._id);

      await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { save: -1 },
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
        _id: unSave?._id,
        user: unSave?.user,
        property: populatedProperty,
        action: 'unsave',
      };
    } else {
      // 🔺 Save bo‘lsa
      const newSave = await this.saveModel.create({
        user: userId,
        property: propertyId,
      });

      await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { save: 1 },
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
        _id: newSave._id,
        user: newSave.user,
        property: populatedProperty,
        action: 'save',
      };
    }
  }

  async findMySaves(userId: string) {
    const saves = await this.saveModel
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
    return saves;
  }
}
