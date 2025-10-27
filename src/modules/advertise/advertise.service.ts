import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Advertise, AdvertiseDocument } from './advertise.schema';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';

@Injectable()
export class AdvertiseService {
  constructor(
    @InjectModel(Advertise.name)
    private readonly advertiseModel: Model<AdvertiseDocument>,
  ) {}

  async create({
    dto,
    author,
    files,
  }: {
    dto: CreateAdvertiseDto;
    author: string;
    files: { image: Express.Multer.File[] };
  }) {}
}
