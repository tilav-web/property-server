import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Developer, DeveloperSchema } from './developer.schema';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';
import { FileModule } from '../file/file.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Developer.name, schema: DeveloperSchema },
    ]),
    FileModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [DeveloperController],
  providers: [DeveloperService],
  exports: [DeveloperService, MongooseModule],
})
export class DeveloperModule {}
