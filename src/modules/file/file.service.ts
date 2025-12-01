import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FileService {
  private serverUrl = process.env.SERVER_URL || '';
  private readonly logger = new Logger(FileService.name);

  saveFile({
    file,
    folder,
  }: {
    file: Express.Multer.File;
    folder: string;
  }): string {
    const uploadPath = join(process.cwd(), 'uploads', folder);

    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    // unique filename
    const ext = file.originalname.split('.').pop();
    const uniqueName = uuid() + '.' + ext;

    const filePath = join(uploadPath, uniqueName);
    writeFileSync(filePath, file.buffer);

    // local path
    const localPath = join('uploads', folder, uniqueName).replace(/\\/g, '/');

    // return FULL URL
    return `${this.serverUrl}/${localPath}`;
  }

  saveFiles({
    files,
    folder,
  }: {
    files: Express.Multer.File[];
    folder: string;
  }): string[] {
    const uploadPath = join(process.cwd(), 'uploads', folder);

    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    const savedFileUrls: string[] = [];

    for (const file of files) {
      const ext = file.originalname.split('.').pop();
      const uniqueName = uuid() + '.' + ext;

      const filePath = join(uploadPath, uniqueName);
      writeFileSync(filePath, file.buffer);

      const localPath = join('uploads', folder, uniqueName).replace(/\\/g, '/');

      savedFileUrls.push(`${this.serverUrl}/${localPath}`);
    }

    return savedFileUrls;
  }

  deleteFile(fileUrl: string): boolean {
    if (!fileUrl) {
      return false;
    }

    try {
      // Extract the local path from the full URL
      const localPath = fileUrl.replace(this.serverUrl + '/', '');
      const fullPath = join(process.cwd(), localPath);

      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        this.logger.log(`Successfully deleted file: ${fullPath}`);
        return true;
      } else {
        this.logger.warn(`File not found, could not delete: ${fullPath}`);
        return false;
      }
    } catch (err) {
      this.logger.error(`Error deleting file: ${fileUrl}`, err.stack);
      return false;
    }
  }
}
