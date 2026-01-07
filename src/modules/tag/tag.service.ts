import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from './schemas/tag.schema';

@Injectable()
export class TagService {
  constructor(
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
  ) {}

  async saveTags(tags: string[]): Promise<void> {
    try {
      const uniqueTags = Array.from(
        new Set(tags.map((tag) => tag.toLowerCase().trim())),
      ).filter((tag) => tag.length > 0);

      const operations = uniqueTags.map((tag) => ({
        updateOne: {
          filter: { value: tag },
          update: { $setOnInsert: { value: tag } },
          upsert: true,
        },
      }));

      if (operations.length > 0) {
        await this.tagModel.bulkWrite(operations, {
          ordered: false,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async findTags(query: string): Promise<TagDocument[]> {
    try {
      if (!query) {
        return [];
      }
      return this.tagModel
        .find({ value: { $regex: query, $options: 'i' } })
        .limit(10)
        .exec();
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}
