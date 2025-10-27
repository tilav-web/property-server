import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Advertise, AdvertiseDocument } from './advertise.schema';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { UpdateAdvertiseDto } from './dto/update-advertise.dto';

@Injectable()
export class AdvertiseService {
  constructor(
    @InjectModel(Advertise.name)
    private readonly advertiseModel: Model<AdvertiseDocument>,
  ) {}

  async create(createAdvertiseDto: CreateAdvertiseDto): Promise<Advertise> {
    const createdAdvertise = new this.advertiseModel(createAdvertiseDto);
    return createdAdvertise.save();
  }

  async findAll(): Promise<Advertise[]> {
    return this.advertiseModel.find().exec();
  }

  async findOne(id: string): Promise<Advertise> {
    const advertise = await this.advertiseModel.findById(id).exec();
    if (!advertise) {
      throw new NotFoundException(`Advertise with id ${id} not found`);
    }
    return advertise;
  }

  async update(
    id: string,
    updateAdvertiseDto: UpdateAdvertiseDto,
  ): Promise<Advertise> {
    const advertise = await this.advertiseModel
      .findByIdAndUpdate(id, updateAdvertiseDto, { new: true })
      .exec();
    if (!advertise) {
      throw new NotFoundException(`Advertise with id ${id} not found`);
    }
    return advertise;
  }

  async remove(id: string): Promise<Advertise> {
    const advertise = await this.advertiseModel.findByIdAndDelete(id).exec();
    if (!advertise) {
      throw new NotFoundException(`Advertise with id ${id} not found`);
    }
    return advertise;
  }
}
