import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CommunityFilter,
  CommunityFilterDocument,
} from './schemas/community-filter.schema';
import { CreateCommunityFilterDto } from './dto/create-community-filter.dto';
import { UpdateCommunityFilterDto } from './dto/update-community-filter.dto';

@Injectable()
export class CommunityFilterService {
  constructor(
    @InjectModel(CommunityFilter.name)
    private readonly model: Model<CommunityFilterDocument>,
  ) {}

  async findAll(opts: { onlyActive?: boolean } = {}) {
    const filter: Record<string, unknown> = {};
    if (opts.onlyActive) filter.isActive = true;
    return this.model.find(filter).sort({ order: 1, name: 1 }).lean().exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id noto\'g\'ri');
    }
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Filter topilmadi');
    return doc;
  }

  async create(dto: CreateCommunityFilterDto) {
    const exists = await this.model.findOne({ key: dto.key }).lean().exec();
    if (exists) throw new ConflictException(`key="${dto.key}" allaqachon mavjud`);
    return this.model.create(dto);
  }

  async update(id: string, dto: UpdateCommunityFilterDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id noto\'g\'ri');
    }
    if (dto.key) {
      const dup = await this.model
        .findOne({ key: dto.key, _id: { $ne: id } })
        .lean()
        .exec();
      if (dup) throw new ConflictException(`key="${dto.key}" boshqada mavjud`);
    }
    const updated = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Filter topilmadi');
    return updated;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id noto\'g\'ri');
    }
    const deleted = await this.model.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Filter topilmadi');
    return { ok: true };
  }

  /**
   * Seed (bootstrap'da chaqiriladi). Mavjud key'larni o'zgartirmaydi —
   * faqat yo'q bo'lganlarini qo'shadi.
   */
  async ensureSeed(seed: CreateCommunityFilterDto[]) {
    for (const entry of seed) {
      await this.model
        .updateOne(
          { key: entry.key },
          { $setOnInsert: entry },
          { upsert: true },
        )
        .exec();
    }
  }
}
