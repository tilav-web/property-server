import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import {
  ProjectView,
  ProjectViewDocument,
} from './schemas/project-view.schema';
import { Project, ProjectDocument } from '../project/project.schema';

export interface ProjectViewedEvent {
  projectId: string;
  userId?: string;
  ip?: string;
}

@Injectable()
export class ProjectViewService {
  constructor(
    @InjectModel(ProjectView.name)
    private readonly viewModel: Model<ProjectViewDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
  ) {}

  @OnEvent('project.viewed', { async: true })
  async handleProjectViewed(event: ProjectViewedEvent): Promise<void> {
    const { projectId, userId, ip } = event;

    const viewerId =
      userId ??
      createHash('sha256')
        .update(ip ?? 'anonymous')
        .digest('hex');

    try {
      const result = await this.viewModel.updateOne(
        { projectId: new Types.ObjectId(projectId), viewerId },
        { $setOnInsert: { viewedAt: new Date() } },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        await this.projectModel.updateOne(
          { _id: new Types.ObjectId(projectId) },
          { $inc: { views: 1 } },
        );
      }
    } catch {
      // View tracking xatosi asosiy funksionalikni bloklamasin
    }
  }
}
