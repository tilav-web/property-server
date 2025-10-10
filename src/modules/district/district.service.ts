import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { District, DistrictDocument } from './district.schema';
import { Model } from 'mongoose';

@Injectable()
export class DistrictService {
  constructor(
    @InjectModel(District.name) private model: Model<DistrictDocument>,
  ) {}

  async findAll() {
    return this.model.find();
  }

  async findAllByRegionCode(region_code: string) {
    return this.model.find({ region_code });
  }
}
