import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { File, FileDocument, FileType } from './file.schema';
import { join } from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Injectable()
export class FileService {
  private readonly uploadFolder = join(process.cwd(), 'uploads', 'avatars');
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

  constructor(@InjectModel(File.name) private fileModel: Model<FileDocument>) {}

  async updateUserAvatar({
    userId,
    file,
  }: {
    userId: string;
    file: MulterFile;
  }): Promise<FileDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Yaroqsiz user ID');
    }

    try {
      // Eski avatar faylini topish
      const oldAvatar = await this.fileModel.findOne({
        document_id: new Types.ObjectId(userId),
        document_type: FileType.AVATAR,
      });

      // Yangi avatar yaratish
      const newAvatar = await this.processAndSaveAvatar(userId, file);

      // Eski avatar faylini o'chirish
      if (oldAvatar) {
        await this.deleteAvatarFile(oldAvatar).catch((error: unknown) => {
          console.error(
            `Eski avatar o'chirishda xato: ${
              error instanceof Error ? error.message : "Noma'lum xato"
            }`,
          );
        });
      }

      return newAvatar;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Avatar yangilashda xato: ${
          error instanceof Error ? error.message : "Noma'lum xato"
        }`,
      );
    }
  }

  private async processAndSaveAvatar(
    userId: string,
    file: MulterFile,
  ): Promise<FileDocument> {
    // Fayl formatini tekshirish
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Faqat ${this.allowedMimeTypes.join(', ')} formatlari qabul qilinadi`,
      );
    }

    // Fayl hajmini tekshirish (masalan, 5MB limit)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        "Fayl hajmi 5MB dan katta bo'lmasligi kerak",
      );
    }

    // Upload papkasini yaratish
    await fs.mkdir(this.uploadFolder, { recursive: true });

    // Fayl nomini generatsiya qilish
    const fileName = `avatar-${userId}-${uuidv4()}.webp`;
    const filePath = join(this.uploadFolder, fileName);

    try {
      // Rasmni optimallashtirish
      const processedImage = await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Faylni saqlash
      await fs.writeFile(filePath, processedImage);

      // Bazaga yozish
      const fileRecord = await this.fileModel.create({
        document_id: new Types.ObjectId(userId),
        document_type: FileType.AVATAR,
        file_name: fileName,
        file_path: join('uploads', 'avatars', fileName),
        mime_type: 'image/webp',
        file_size: processedImage.length,
        original_name: file.originalname,
        metadata: {
          original_mime_type: file.mimetype,
          original_size: file.size,
          processed: true,
          dimensions: { width: 300, height: 300 },
        },
      });

      return fileRecord;
    } catch (error: unknown) {
      // Xato yuzaga kelsa, yaratilgan faylni o'chirish
      await fs.unlink(filePath).catch(() => {}); // Xato logging qilinmaydi
      throw new InternalServerErrorException(
        `Rasmni qayta ishlashda xato: ${
          error instanceof Error ? error.message : "Noma'lum xato"
        }`,
      );
    }
  }

  private async deleteAvatarFile(avatar: FileDocument): Promise<void> {
    const filePath = join(process.cwd(), avatar.file_path);

    await Promise.all([
      // Faylni filesystemdan o'chirish
      fs.unlink(filePath).catch((error: unknown) => {
        console.warn(
          `Faylni o'chirishda xato (ehtimol fayl mavjud emas): ${
            error instanceof Error ? error.message : "Noma'lum xato"
          }`,
        );
      }),
      // Bazadan o'chirish
      this.fileModel.findByIdAndDelete(avatar._id),
    ]);
  }

  async getUserAvatar(userId: string): Promise<FileDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Yaroqsiz user ID');
    }

    return this.fileModel.findOne({
      document_id: new Types.ObjectId(userId),
      document_type: FileType.AVATAR,
    });
  }

  async deleteUserAvatar(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Yaroqsiz user ID');
    }

    const avatar = await this.getUserAvatar(userId);
    if (avatar) {
      await this.deleteAvatarFile(avatar);
    }
  }
}
