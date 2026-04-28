import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './project.schema';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { FileModule } from '../file/file.module';
import { DeveloperModule } from '../developer/developer.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    FileModule,
    DeveloperModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService, MongooseModule],
})
export class ProjectModule {}
