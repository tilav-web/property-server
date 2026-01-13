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
    page?: number;
    limit?: number;
    type?: EnumAdvertiseType;
    sample?: boolean;
    sort?: Record<string, 1 | -1>;
  }) {
    const { page = 1, limit = 10, type, sample = false, sort } = params;

    const filter: FilterQuery<AdvertiseDocument> = {
      status: EnumAdvertiseStatus.APPROVED,
      payment_status: EnumPaymentStatus.PAID,
      from: { $ne: null, $lte: new Date() },
      to: { $ne: null, $gte: new Date() },
    };

    if (type) {
      filter.type = type;
    }

    const query = this.advertiseModel.find(filter);

    if (sort) {
      query.sort(sort);
    }

    if (sample) {
      const total = await this.advertiseModel.countDocuments(filter).exec();
      const sampleSize = Math.min(limit, total);
      let advertises: AdvertiseDocument[] = [];

      if (sampleSize > 0) {
        advertises = await this.advertiseModel.aggregate([
          { $match: filter },
          { $sample: { size: sampleSize } },
        ]);
      }
      return advertises;
    }

    const skip = (page - 1) * limit;
    const advertises = await query
      .skip(skip)
      .limit(limit)
      .populate('author', 'first_name last_name avatar')
      .lean()
      .exec();

    const total = await this.advertiseModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return {
      data: advertises,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async incrementView(id: string) {
    return this.advertiseModel.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );
  }

  async incrementClick(id: string) {
    return this.advertiseModel.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } },
      { new: true },
    );
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
      currency: process.env.ADVERTISE_CURRENCY || 'RM',
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
