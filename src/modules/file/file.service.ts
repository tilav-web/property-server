import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import { join, resolve, sep } from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

const PHOTO_FOLDERS = new Set(['photos', 'avatars']);
const FULL_MAX_WIDTH = 1920;
const THUMB_MAX_WIDTH = 400;
const WEBP_QUALITY = 80;

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  private readonly endpoint = process.env.DO_SPACES_ENDPOINT ?? '';
  private readonly region = process.env.DO_SPACES_REGION ?? 'sgp1';
  private readonly bucket = process.env.DO_SPACES_BUCKET ?? '';
  private readonly cdnBase = (process.env.DO_SPACES_CDN_URL ?? '').replace(
    /\/$/,
    '',
  );

  private readonly s3 = new S3Client({
    endpoint: this.endpoint,
    region: this.region,
    forcePathStyle: false,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY ?? '',
      secretAccessKey: process.env.DO_SPACES_SECRET ?? '',
    },
  });

  // Legacy local uploads — still served via /uploads route for pre-migration data
  private readonly legacyBaseUrl = (process.env.SERVER_URL ?? '').replace(
    /\/$/,
    '',
  );
  private readonly legacyRoot = resolve(
    join(__dirname, '..', '..', '..', 'uploads'),
  );

  async saveFile({
    file,
    folder,
  }: {
    file: Express.Multer.File;
    folder: string;
  }): Promise<string> {
    if (!this.bucket) {
      throw new Error('DO_SPACES_BUCKET is not configured');
    }

    const baseName = this.randomBaseName();
    const shouldProcessImage =
      PHOTO_FOLDERS.has(folder) && this.isImage(file.mimetype);

    if (shouldProcessImage) {
      const { fullBuf, thumbBuf } = await this.processImage(file.buffer);
      const fullKey = `${folder}/${baseName}.webp`;
      const thumbKey = `${folder}/${baseName}_thumb.webp`;

      await Promise.all([
        this.putObject(fullKey, fullBuf, 'image/webp'),
        this.putObject(thumbKey, thumbBuf, 'image/webp'),
      ]);

      return this.cdnUrl(fullKey);
    }

    // Non-image or files/videos: upload raw
    const ext = this.extractExtension(file.originalname, file.mimetype);
    const key = `${folder}/${baseName}${ext}`;
    await this.putObject(key, file.buffer, file.mimetype);
    return this.cdnUrl(key);
  }

  async saveFiles({
    files,
    folder,
  }: {
    files: Express.Multer.File[];
    folder: string;
  }): Promise<string[]> {
    return Promise.all(files.map((file) => this.saveFile({ file, folder })));
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false;

    try {
      // Spaces-hosted file
      const key = this.keyFromUrl(fileUrl);
      if (key) {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        // If photo/avatar, also drop the thumbnail sibling
        const thumbKey = this.thumbKeyFor(key);
        if (thumbKey && thumbKey !== key) {
          await this.s3
            .send(
              new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: thumbKey,
              }),
            )
            .catch(() => undefined);
        }
        return true;
      }

      // Legacy local upload
      return await this.deleteLegacyFile(fileUrl);
    } catch (err) {
      this.logger.error(`Delete failed: ${fileUrl}`, err as Error);
      return false;
    }
  }

  // Helper for consumers that want the thumbnail URL (cards, avatars small)
  getThumbUrl(url: string): string {
    const key = this.keyFromUrl(url);
    if (!key || !key.endsWith('.webp')) return url;
    if (key.includes('_thumb.webp')) return url;
    const thumb = key.replace(/\.webp$/, '_thumb.webp');
    return this.cdnUrl(thumb);
  }

  // ---------- internals ----------

  private async processImage(
    buffer: Buffer,
  ): Promise<{ fullBuf: Buffer; thumbBuf: Buffer }> {
    const base = sharp(buffer, { failOn: 'none' }).rotate();
    const [fullBuf, thumbBuf] = await Promise.all([
      base
        .clone()
        .resize({
          width: FULL_MAX_WIDTH,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
      base
        .clone()
        .resize({
          width: THUMB_MAX_WIDTH,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
    ]);
    return { fullBuf, thumbBuf };
  }

  private async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  private cdnUrl(key: string): string {
    const base =
      this.cdnBase ||
      `${this.endpoint.replace(/\/$/, '')}/${this.bucket}`.replace(
        'https://',
        `https://${this.bucket}.`,
      );
    return `${base}/${key}`;
  }

  private keyFromUrl(url: string): string | null {
    if (!url) return null;
    const candidates = [
      this.cdnBase,
      `${this.endpoint}/${this.bucket}`,
      `https://${this.bucket}.${this.endpoint.replace(/^https?:\/\//, '')}`,
    ].filter(Boolean);
    for (const prefix of candidates) {
      if (url.startsWith(prefix + '/')) {
        return url.slice(prefix.length + 1).split('?')[0];
      }
    }
    return null;
  }

  private thumbKeyFor(key: string): string | null {
    if (!key.endsWith('.webp')) return null;
    if (key.includes('_thumb.webp')) return null;
    return key.replace(/\.webp$/, '_thumb.webp');
  }

  private randomBaseName(): string {
    return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  }

  private isImage(mimetype: string): boolean {
    return /^image\//i.test(mimetype);
  }

  private extractExtension(originalName: string, mimetype: string): string {
    const fromName = originalName.includes('.')
      ? '.' + originalName.split('.').pop()!.toLowerCase()
      : '';
    if (fromName) return fromName;
    const fromMime = mimetype.split('/')[1];
    return fromMime ? `.${fromMime}` : '';
  }

  // ---------- legacy local-disk path (for pre-migration URLs) ----------

  private async deleteLegacyFile(fileUrl: string): Promise<boolean> {
    try {
      const isHttpUrl = /^https?:\/\//i.test(fileUrl);
      if (
        isHttpUrl &&
        (!this.legacyBaseUrl ||
          !fileUrl.startsWith(`${this.legacyBaseUrl}/`))
      ) {
        this.logger.warn(`External URL, skipping delete: ${fileUrl}`);
        return true;
      }

      const localPath = decodeURIComponent(
        isHttpUrl ? fileUrl.slice(this.legacyBaseUrl.length + 1) : fileUrl,
      );
      const relativePath = localPath
        .replace(/^\/+/, '')
        .replace(/^uploads[\\/]/, '');
      const fullPath = resolve(this.legacyRoot, relativePath);

      if (
        fullPath !== this.legacyRoot &&
        !fullPath.startsWith(`${this.legacyRoot}${sep}`)
      ) {
        this.logger.warn(`Invalid legacy path: ${fullPath}`);
        return false;
      }

      await fs.unlink(fullPath);
      this.logger.log(`Deleted legacy: ${fullPath}`);
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'ENOENT') {
        this.logger.warn(`Legacy file not found: ${fileUrl}`);
        return true;
      }
      this.logger.error(`Legacy delete failed: ${fileUrl}`, err as Error);
      return false;
    }
  }
}
