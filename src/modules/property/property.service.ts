import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Property, PropertyDocument } from './schemas/property.schema';
import { FilterQuery, Model } from 'mongoose';
import { FileService } from '../file/file.service';
import { OpenaiService } from '../openai/openai.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { EnumPropertyCategory } from './enums/property-category.enum';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { Language } from 'src/common/language/language.schema';
import { EnumLanguage } from 'src/enums/language.enum';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_RENT)
    private readonly apartmentRentModel: Model<PropertyDocument>,
    @InjectModel(EnumPropertyCategory.APARTMENT_SALE)
    private readonly apartmentSaleModel: Model<PropertyDocument>,
    private readonly fileService: FileService,
    private readonly openaiService: OpenaiService,
  ) {}

  async create({
    dto,
    files,
    author,
  }: {
    dto: CreatePropertyDto;
    files: {
      photos?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    };
    author?: string;
  }) {
    const { category } = dto;

    if (!category) {
      throw new BadRequestException('Category talabi majburiy!');
    }
    if (!author) {
      throw new BadRequestException('Log back in system!');
    }

    // Fayllarni saqlash
    const photos = files?.photos?.length
      ? this.fileService.saveFiles({
          files: files.photos,
          folder: EnumFilesFolder.PHOTOS,
        })
      : [];

    const videos = files?.videos?.length
      ? this.fileService.saveFiles({
          files: files.videos,
          folder: EnumFilesFolder.VIDEOS,
        })
      : [];

    let Model: Model<PropertyDocument>;

    switch (category) {
      case EnumPropertyCategory.APARTMENT_RENT:
        Model = this.apartmentRentModel;
        break;
      case EnumPropertyCategory.APARTMENT_SALE:
        Model = this.apartmentSaleModel;
        break;
      default:
        throw new BadRequestException("Qo'llab-quvvatlanmaydigan kategoriya");
    }

    const location = {
      type: 'Point',
      coordinates: [dto.location_lng, dto.location_lat],
    };

    const language = this.openaiService.translateTexts({
      title: dto.title,
      description: dto.description,
      address: dto.address,
    });

    const property = await Model.create({
      ...dto,
      photos,
      videos,
      author,
      location,
      title: language.title,
      description: language.description,
      address: language.address,
    });

    return property;
  }

  async findMyProperties({
    search,
    author,
    language,
    page = 1,
    limit = 10,
  }: {
    search?: string;
    author?: string;
    language?: EnumLanguage;
    page?: number;
    limit?: number;
  }) {
    const match: FilterQuery<PropertyDocument> = {};
    if (!author) {
      throw new NotFoundException('Author not found!');
    }
    match.author = author;

    if (search) {
      match.$or = Object.values(Language).flatMap((lang) => [
        { [`title.${lang}`]: { $regex: search, $options: 'i' } },
        { [`description.${lang}`]: { $regex: search, $options: 'i' } },
        { [`address.${lang}`]: { $regex: search, $options: 'i' } },
      ]);
    }

    const aggregation = this.propertyModel.aggregate([
      {
        $match: match,
      },
      {
        $project: {
          all: '$$ROOT',
          title: { $ifNull: [`$title.${language}`, '$title.uz'] },
          description: {
            $ifNull: [`$description.${language}`, '$description.uz'],
          },
          address: { $ifNull: [`$address.${language}`, '$address.uz'] },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$all',
              {
                title: '$title',
                description: '$description',
                address: '$address',
              },
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);
    return aggregation.exec();
  }
}
