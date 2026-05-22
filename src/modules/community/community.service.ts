import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Community, CommunityDocument } from './schemas/community.schema';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { FileService } from '../file/file.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    @InjectModel(Community.name)
    private readonly model: Model<CommunityDocument>,
    private readonly fileService: FileService,
  ) {}

  async findPublic(opts: { region?: string; filter?: string } = {}) {
    const query: Record<string, unknown> = { isActive: true };
    if (opts.region) query.region = opts.region;
    if (opts.filter && Types.ObjectId.isValid(opts.filter)) {
      query.filters = new Types.ObjectId(opts.filter);
    }
    return this.model
      .find(query)
      .sort({ order: 1, rating: -1, name: 1 })
      .populate('filters', 'key name icon order')
      .lean()
      .exec();
  }

  async findAllAdmin() {
    return this.model
      .find()
      .sort({ region: 1, order: 1, name: 1 })
      .populate('filters', 'key name icon')
      .lean()
      .exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id noto\'g\'ri');
    }
    const doc = await this.model
      .findById(id)
      .populate('filters', 'key name icon')
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Community topilmadi');
    return doc;
  }

  async create(dto: CreateCommunityDto, image?: Express.Multer.File) {
    const payload: Record<string, unknown> = {
      ...dto,
      filters: dto.filters?.map((id) => new Types.ObjectId(id)) ?? [],
    };
    if (image) {
      payload.image = await this.fileService.saveFile({
        file: image,
        folder: EnumFilesFolder.PHOTOS,
      });
    }
    return this.model.create(payload);
  }

  async update(
    id: string,
    dto: UpdateCommunityDto,
    image?: Express.Multer.File,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id noto\'g\'ri');
    }
    const existing = await this.model.findById(id).exec();
    if (!existing) throw new NotFoundException('Community topilmadi');

    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.region !== undefined) existing.region = dto.region;
    if (dto.rating !== undefined) existing.rating = dto.rating;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.badge !== undefined) existing.badge = dto.badge || null;
    if (dto.searchHref !== undefined) {
      existing.searchHref = dto.searchHref || null;
    }
    if (dto.filters !== undefined) {
      existing.filters = dto.filters.map((fid) => new Types.ObjectId(fid));
    }
    if (dto.propertyCount !== undefined) {
      existing.propertyCount = dto.propertyCount;
    }
    if (dto.order !== undefined) existing.order = dto.order;
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;

    if (image) {
      if (existing.image) {
        await this.fileService.deleteFile(existing.image).catch(() => null);
      }
      existing.image = await this.fileService.saveFile({
        file: image,
        folder: EnumFilesFolder.PHOTOS,
      });
    }

    return existing.save();
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id noto\'g\'ri');
    }
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Community topilmadi');
    if (doc.image) {
      await this.fileService.deleteFile(doc.image).catch(() => null);
    }
    await doc.deleteOne();
    return { ok: true };
  }

  /**
   * Bootstrap seed — agar DB bo'sh bo'lsa, hardcoded data joylaymiz.
   */
  async ensureSeed(
    seed: Array<{
      name: string;
      region?: string;
      rating?: number;
      filterKey: string;
      filterId: string;
      order?: number;
    }>,
  ) {
    const count = await this.model.countDocuments().exec();
    if (count > 0) return;
    const docs = seed.map((s) => ({
      name: s.name,
      region: s.region ?? 'Qashqadaryo',
      rating: s.rating ?? 4.5,
      filters: [new Types.ObjectId(s.filterId)],
      order: s.order ?? 0,
      isActive: true,
    }));
    await this.model.insertMany(docs);
    this.logger.log(`Seeded ${docs.length} communities`);
  }
}
