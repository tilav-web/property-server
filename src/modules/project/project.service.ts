import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  Project,
  ProjectDocument,
  EnumProjectStatus,
} from './project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FileService } from '../file/file.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { DeveloperService } from '../developer/developer.service';

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  developer?: string;
  city?: string;
  status?: EnumProjectStatus;
  is_featured?: boolean;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular';
}

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name)
    private readonly model: Model<ProjectDocument>,
    private readonly fileService: FileService,
    private readonly developerService: DeveloperService,
  ) {}

  async create({
    dto,
    files,
  }: {
    dto: CreateProjectDto;
    files?: {
      photos?: Express.Multer.File[];
      brochure?: Express.Multer.File[];
    };
  }) {
    if (!Types.ObjectId.isValid(dto.developer)) {
      throw new BadRequestException('Noto‘g‘ri developer ID');
    }

    const data: Partial<Project> = {
      ...dto,
      developer: new Types.ObjectId(dto.developer),
    };

    if (files?.photos?.length) {
      data.photos = await this.fileService.saveFiles({
        files: files.photos,
        folder: EnumFilesFolder.PHOTOS,
      });
    }
    if (files?.brochure?.[0]) {
      data.brochure = await this.fileService.saveFile({
        file: files.brochure[0],
        folder: EnumFilesFolder.FILES,
      });
    }

    const created = await this.model.create(data);
    await this.developerService.incrementProjectsCount(dto.developer, 1);
    return created;
  }

  async findAll(opts: FindAllOptions) {
    const {
      page = 1,
      limit = 12,
      search,
      developer,
      city,
      status,
      is_featured,
      sort = 'newest',
    } = opts;

    const filter: FilterQuery<ProjectDocument> = {};
    if (search) filter.$text = { $search: search };
    if (developer && Types.ObjectId.isValid(developer))
      filter.developer = new Types.ObjectId(developer);
    if (city) filter.city = city;
    if (status) filter.status = status;
    if (is_featured !== undefined) filter.is_featured = is_featured;

    let sortStage: Record<string, 1 | -1> = { is_featured: -1, createdAt: -1 };
    if (sort === 'oldest') sortStage = { createdAt: 1 };
    else if (sort === 'price_asc') sortStage = { launch_price: 1 };
    else if (sort === 'price_desc') sortStage = { launch_price: -1 };
    else if (sort === 'popular') sortStage = { views: -1, createdAt: -1 };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('developer', 'name logo')
        .sort(sortStage)
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

  async findById(id: string, incrementView = false) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Noto‘g‘ri loyiha ID');
    }
    const project = incrementView
      ? await this.model
          .findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
          .populate('developer')
          .lean()
      : await this.model.findById(id).populate('developer').lean();
    if (!project) throw new NotFoundException('Loyiha topilmadi');
    return project;
  }

  async update({
    id,
    dto,
    files,
  }: {
    id: string;
    dto: UpdateProjectDto;
    files?: {
      photos?: Express.Multer.File[];
      brochure?: Express.Multer.File[];
    };
  }) {
    const existing = await this.model.findById(id);
    if (!existing) throw new NotFoundException('Loyiha topilmadi');

    const oldDeveloperId = existing.developer.toString();

    const { developer: developerInput, ...rest } = dto;
    const data: Partial<Project> = { ...rest };
    if (developerInput) {
      if (!Types.ObjectId.isValid(developerInput)) {
        throw new BadRequestException('Noto‘g‘ri developer ID');
      }
      data.developer = new Types.ObjectId(developerInput);
    }

    if (files?.photos?.length) {
      const newPhotos = await this.fileService.saveFiles({
        files: files.photos,
        folder: EnumFilesFolder.PHOTOS,
      });
      // Photos update: append (admin can clear via separate endpoint later)
      data.photos = [...(existing.photos || []), ...newPhotos];
    }
    if (files?.brochure?.[0]) {
      if (existing.brochure)
        await this.fileService.deleteFile(existing.brochure);
      data.brochure = await this.fileService.saveFile({
        file: files.brochure[0],
        folder: EnumFilesFolder.FILES,
      });
    }

    Object.assign(existing, data);
    const saved = await existing.save();

    if (dto.developer && oldDeveloperId !== dto.developer) {
      await this.developerService.incrementProjectsCount(oldDeveloperId, -1);
      await this.developerService.incrementProjectsCount(dto.developer, 1);
    }
    return saved;
  }

  async remove(id: string) {
    const project = await this.model.findById(id);
    if (!project) throw new NotFoundException('Loyiha topilmadi');
    if (project.photos?.length) {
      await Promise.all(
        project.photos.map((url) => this.fileService.deleteFile(url)),
      );
    }
    if (project.brochure) {
      await this.fileService.deleteFile(project.brochure);
    }
    await this.model.deleteOne({ _id: project._id });
    await this.developerService.incrementProjectsCount(
      project.developer.toString(),
      -1,
    );
    return { ok: true };
  }

  async removePhoto({ id, url }: { id: string; url: string }) {
    const project = await this.model.findById(id);
    if (!project) throw new NotFoundException('Loyiha topilmadi');
    project.photos = (project.photos || []).filter((p) => p !== url);
    await project.save();
    await this.fileService.deleteFile(url);
    return project;
  }
}
