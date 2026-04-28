import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Developer, DeveloperDocument } from './developer.schema';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { FileService } from '../file/file.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';

@Injectable()
export class DeveloperService {
  constructor(
    @InjectModel(Developer.name)
    private readonly model: Model<DeveloperDocument>,
    private readonly fileService: FileService,
  ) {}

  async create({
    dto,
    files,
  }: {
    dto: CreateDeveloperDto;
    files?: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] };
  }) {
    const data: Partial<Developer> = { ...dto };
    if (files?.logo?.[0]) {
      data.logo = await this.fileService.saveFile({
        file: files.logo[0],
        folder: EnumFilesFolder.PHOTOS,
      });
    }
    if (files?.cover?.[0]) {
      data.cover = await this.fileService.saveFile({
        file: files.cover[0],
        folder: EnumFilesFolder.PHOTOS,
      });
    }
    return this.model.create(data);
  }

  async findAll({
    page = 1,
    limit = 20,
    search,
  }: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const filter: Record<string, unknown> = { is_active: true };
    if (search) filter.$text = { $search: search };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ projects_count: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Noto‘g‘ri developer ID');
    }
    const dev = await this.model.findById(id).lean();
    if (!dev) throw new NotFoundException('Developer topilmadi');
    return dev;
  }

  async update({
    id,
    dto,
    files,
  }: {
    id: string;
    dto: UpdateDeveloperDto;
    files?: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] };
  }) {
    const existing = await this.model.findById(id);
    if (!existing) throw new NotFoundException('Developer topilmadi');

    const data: Partial<Developer> = { ...dto };

    if (files?.logo?.[0]) {
      if (existing.logo) await this.fileService.deleteFile(existing.logo);
      data.logo = await this.fileService.saveFile({
        file: files.logo[0],
        folder: EnumFilesFolder.PHOTOS,
      });
    }
    if (files?.cover?.[0]) {
      if (existing.cover) await this.fileService.deleteFile(existing.cover);
      data.cover = await this.fileService.saveFile({
        file: files.cover[0],
        folder: EnumFilesFolder.PHOTOS,
      });
    }

    Object.assign(existing, data);
    return existing.save();
  }

  async remove(id: string) {
    const dev = await this.model.findById(id);
    if (!dev) throw new NotFoundException('Developer topilmadi');
    if (dev.logo) await this.fileService.deleteFile(dev.logo);
    if (dev.cover) await this.fileService.deleteFile(dev.cover);
    await this.model.deleteOne({ _id: dev._id });
    return { ok: true };
  }

  // Project create/update/delete tomonidan chaqiriladi
  async incrementProjectsCount(developerId: string, delta: number) {
    if (!Types.ObjectId.isValid(developerId)) return;
    await this.model.findByIdAndUpdate(developerId, {
      $inc: { projects_count: delta },
    });
  }
}
