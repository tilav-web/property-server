import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from '../../tag/schemas/tag.schema';

// Define a clear interface for the paginated response
export interface PaginatedTags {
  data: Tag[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminTagService {
  constructor(
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
  ) {}

  async findAll(page = 1, limit = 10): Promise<PaginatedTags> {
    const skip = (page - 1) * limit;
    const [tags, total] = await Promise.all([
      this.tagModel
        .find()
        .sort({ value: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.tagModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: tags as Tag[], // Cast to Tag[] as lean() returns plain objects
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(value: string): Promise<TagDocument> {
    const newTag = await this.tagModel.create({ value });
    return newTag;
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = await this.tagModel.findById(id);
    if (!tag) {
      throw new NotFoundException('Tag not found!');
    }
    await tag.deleteOne();
    return { message: 'Tag successfully deleted' };
  }

  async searchTags(
    query: string,
    limit = 20,
  ): Promise<{ _id: any; value: string }[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const regex = new RegExp(`^${query.trim()}`, 'i');

    const tags = await this.tagModel
      .find({ value: regex })
      .limit(limit)
      .lean()
      .exec();

    return tags.map((t) => ({
      _id: t._id,
      value: t.value,
    }));
  }
}
