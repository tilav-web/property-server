import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectView, ProjectViewSchema } from './schemas/project-view.schema';
import { Project, ProjectSchema } from '../project/project.schema';
import { ProjectViewService } from './project-view.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectView.name, schema: ProjectViewSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  providers: [ProjectViewService],
  exports: [ProjectViewService],
})
export class ProjectViewModule {}
