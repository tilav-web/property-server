import { Injectable } from '@nestjs/common';
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

  async saveProperty(userId: string, propertyId: string): Promise<Property> {
    const save = await this.saveModel.findOne({
      user: userId,
      property: propertyId,
    });

    if (save) {
      await this.saveModel.findByIdAndDelete(save._id);
      await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { save: -1 },
      });
    } else {
      await this.saveModel.create({ user: userId, property: propertyId });
      await this.propertyModel.findByIdAndUpdate(propertyId, {
        $inc: { save: 1 },
      });
    }

    return this.propertyModel
      .findById(propertyId)
      .lean()
      .exec() as Promise<Property>;
  }

  async getSavedProperties(userId: string): Promise<Property[]> {
    const saves = await this.saveModel
      .find({ user: userId })
      .populate('property');
    return saves.map((save) => save.property as unknown as Property);
  }
}
