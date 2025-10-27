import { BadRequestException, Injectable } from '@nestjs/common';
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
    const { totalPrice } = this.priceCalculus(parseInt(dto.days, 10));
    const newAdvertise = await this.advertiseModel.create({
      ...dto,
      author,
      price: totalPrice,
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

  priceCalculus(days: number) {
    const dailyPrice = Number(process.env.ADVERTISE_DAILY_PRICE);
    if (!dailyPrice || Number.isNaN(dailyPrice) || dailyPrice < 0) {
      throw new BadRequestException('Serverda kunlik narx noto‘g‘ri sozlangan');
    }

    const totalPrice = days * dailyPrice;

    return {
      days,
      totalPrice,
      currency: process.env.ADVERTISE_CURRENCY || 'UZS',
    };
  }
}
