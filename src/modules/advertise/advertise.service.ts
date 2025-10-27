import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Advertise, AdvertiseDocument } from './advertise.schema';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { FileService } from '../file/file.service';
import { FileType } from '../file/file.schema';

@Injectable()
export class AdvertiseService {
  constructor(
    @InjectModel(Advertise.name)
    private readonly advertiseModel: Model<AdvertiseDocument>,
    private readonly fileService: FileService,
  ) {}

  async create({
    dto,
    author,
    files,
  }: {
    dto: CreateAdvertiseDto;
    author: string;
    files: { image?: Express.Multer.File[] };
  }) {
    const newAdvertise = await this.advertiseModel.create({
      ...dto,
      author,
    });

    if (files && files.image) {
      await this.fileService.uploadFiles(
        newAdvertise._id as string,
        FileType.ADVERTISE,
        {
          advertise: files.image,
        },
      );
    }

    return this.advertiseModel
      .findById(newAdvertise._id)
      .populate('image')
      .lean()
      .exec();
  }
}
