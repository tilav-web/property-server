import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [MulterModule.register()],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
