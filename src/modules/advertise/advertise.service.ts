import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Advertise, AdvertiseDocument } from './advertise.schema';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { FileService } from '../file/file.service';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';

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
    files: { image: Express.Multer.File[] };
  }) {
    const { totalPrice } = this.priceCalculus(dto.days);
    const image = await this.fileService.saveFile({
      folder: EnumFilesFolder.PHOTOS,
      file: files.image[0],
    });
    const newAdvertise = await this.advertiseModel.create({
      ...dto,
      author,
      price: totalPrice,
      image,
    });

    return this.advertiseModel.findById(newAdvertise._id).exec();
  }

  async findAll(params: {
    limit?: number;
    type?: EnumAdvertiseType;
    sample?: boolean;
  }) {
    const { limit = 10, type, sample = false } = params;

    const filter: FilterQuery<AdvertiseDocument> = {
      status: EnumAdvertiseStatus.APPROVED,
      payment_status: EnumPaymentStatus.PAID,
      from: { $ne: null, $lte: new Date() },
      to: { $ne: null, $gte: new Date() },
    };

    if (type) {
      filter.type = type;
    }

    if (sample) {
      const total = await this.advertiseModel.countDocuments(filter).exec();
      const sampleSize = Math.min(limit, total);
      let advertises: AdvertiseDocument[] = [];

      if (sampleSize > 0) {
        const randomSkip = Math.max(
          0,
          Math.floor(Math.random() * (total - sampleSize)),
        );
        advertises = await this.advertiseModel
          .find(filter)
          .skip(randomSkip)
          .limit(sampleSize)
          .lean()
          .exec();
      }
      return advertises;
    } else {
      const advertises = await this.advertiseModel
        .find(filter)
        .limit(limit)
        .populate('image')
        .lean()
        .exec();
      return advertises;
    }
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

  async findMy(author: string) {
    const advertises = await this.advertiseModel.find({ author });
    return advertises;
  }

  async findOneByType(type: EnumAdvertiseType) {
    const count = await this.advertiseModel.countDocuments({
      type,
      status: EnumAdvertiseStatus.APPROVED,
      payment_status: EnumPaymentStatus.PAID,
    });

    if (count === 0) return null; // Agar reklama bo'lmasa

    // Tasodifiy offset tanlaymiz
    const offset = Math.floor(Math.random() * count);

    // Bitta tasodifiy reklamani olamiz
    const [advertise] = await this.advertiseModel
      .find({
        type,
        status: EnumAdvertiseStatus.APPROVED,
        payment_status: EnumPaymentStatus.PAID,
      })
      .skip(offset)
      .limit(1);

    return advertise ?? null;
  }
}
