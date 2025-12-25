import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  Advertise,
  AdvertiseDocument,
} from 'src/modules/advertise/advertise.schema';
import { FindAdvertisesDto } from '../dto/find-advertises.dto';
import { UpdateAdvertiseStatusDto } from '../dto/update-advertise-status.dto';

@Injectable()
export class AdminAdvertiseService {
  constructor(
    @InjectModel(Advertise.name)
    private advertiseModel: Model<AdvertiseDocument>,
  ) {}

  async findAll(dto: FindAdvertisesDto) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      payment_status,
    } = dto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<AdvertiseDocument> = {};

    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }
    if (payment_status) {
      filter.payment_status = payment_status;
    }

    const advertises = await this.advertiseModel
      .find(filter)
      .populate('author', 'first_name last_name email')
      .populate('target') // Assuming 'target' is a ref to 'Property'
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.advertiseModel.countDocuments(filter);
    const hasMore = page * limit < total;

    return {
      advertises,
      total,
      page,
      limit,
      hasMore,
    };
  }

  async updateStatus(
    id: string,
    updateAdvertiseStatusDto: UpdateAdvertiseStatusDto,
  ): Promise<Advertise> {
    const update: { status?: string; payment_status?: string } = {};

    if (updateAdvertiseStatusDto.status) {
      update.status = updateAdvertiseStatusDto.status;
    }

    if (updateAdvertiseStatusDto.paymentStatus) {
      update.payment_status = updateAdvertiseStatusDto.paymentStatus;
    }

    const updatedAdvertise = await this.advertiseModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    if (!updatedAdvertise) {
      throw new NotFoundException(`Advertise with ID ${id} not found`);
    }

    return updatedAdvertise;
  }
}
