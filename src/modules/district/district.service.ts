import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { District, DistrictDocument } from './district.schema';
import { Model } from 'mongoose';
import { RegionService } from '../region/region.service';

@Injectable()
export class DistrictService {
  constructor(
    @InjectModel(District.name) private model: Model<DistrictDocument>,
    private readonly regionService: RegionService,
  ) {}

  async findAll() {
    return this.model.find();
  }

  async findAllByRegionCode(region_code: string) {
    return this.model.find({ region_code });
  }

  async findAllByRegionId(id: string) {
    const region = await this.regionService.findByID(id);
    if (!region) throw new BadRequestException('Region not found!');
    return this.model.find({ region_code: region.code });
  }
}
