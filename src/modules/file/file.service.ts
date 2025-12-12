import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly baseUrl = (process.env.SERVER_URL || '').replace(/\/$/, '');
  private readonly uploadRoot = join(process.cwd(), 'uploads');

  async saveFile({
    file,
    folder,
  }: {
    file: Express.Multer.File;
    folder: string;
  }): Promise<string> {
    const filePath = this.getUniquePath(folder, file.originalname);
    await this.ensureDir(filePath);
    await fs.writeFile(filePath, file.buffer);
    return this.toUrl(filePath);
  }

  async saveFiles({
    files,
    folder,
  }: {
    files: Express.Multer.File[];
    folder: string;
  }): Promise<string[]> {
    const saves = files.map((file) => this.saveFile({ file, folder }));
    return Promise.all(saves);
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false;

    try {
      const localPath = fileUrl.replace(this.baseUrl + '/', '');
      const fullPath = join(process.cwd(), localPath);

      await fs.unlink(fullPath);
      this.logger.log(`Deleted: ${fullPath}`);
      return true;
    } catch (err: any) {
      if (err) {
        this.logger.warn(`File not found: ${fileUrl}`);
      } else {
        this.logger.error(`Delete failed: ${fileUrl}`, err);
      }
      return false;
    }
  }

  // ── Helpers ─────────────────────────────────────

  private getUniquePath(folder: string, originalName: string): string {
    const ext = originalName.includes('.')
      ? '.' + originalName.split('.').pop()!
      : '';
    return join(this.uploadRoot, folder, uuid() + ext);
  }

  private async ensureDir(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    await fs.mkdir(dir, { recursive: true });
  }

  private toUrl(fullPath: string): string {
    return (
      this.baseUrl +
      '/' +
      fullPath.replace(this.uploadRoot, 'uploads').replace(/\\/g, '/')
    );
  }
}
