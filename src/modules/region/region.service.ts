import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Region, RegionDocument } from './region.schema';
import { Model } from 'mongoose';

@Injectable()
export class RegionService {
  constructor(@InjectModel(Region.name) private model: Model<RegionDocument>) {}

  async findAll() {
    return this.model.find();
  }

  async findByID(id: string) {
    return this.model.findById(id);
  }

  async findByCode(code: string) {
    return this.model.findOne({ code });
  }
}
