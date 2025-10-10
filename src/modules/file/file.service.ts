import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { File, FileDocument, FileType } from './file.schema';
import { join, extname } from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { MulterFile } from 'src/interfaces/multer-file.interface';

@Injectable()
export class FileService {
  private readonly baseUploadFolder = join(process.cwd(), 'uploads');
  private readonly avatarUploadFolder = join(this.baseUploadFolder, 'avatars');
  private readonly propertyUploadFolder = join(this.baseUploadFolder, 'images');
  private readonly sellerUploadFolder = join(this.baseUploadFolder, 'files');

  private readonly allowedImageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly allowedVideoMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];
  private readonly allowedDocumentMimeTypes = ['application/pdf'];

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
      const oldAvatar = await this.fileModel.findOne({
        document_id: userId,
        document_type: FileType.AVATAR,
      });

      const newAvatar = await this.processAndSaveFile(
        userId,
        file,
        'avatar',
        FileType.AVATAR,
        this.avatarUploadFolder,
        this.allowedImageMimeTypes,
      );

      if (oldAvatar) {
        await this.deleteFileRecordAndFs(oldAvatar).catch((error: unknown) => {
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

  async uploadPropertyFiles(
    documentId: string,
    files: {
      banner?: MulterFile[];
      photos?: MulterFile[];
      videos?: MulterFile[];
    },
  ): Promise<FileDocument[]> {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new BadRequestException('Yaroqsiz mulk ID');
    }

    const uploadedFiles: FileDocument[] = [];

    // Handle banner (max 1)
    if (files.banner && files.banner.length > 0) {
      if (files.banner.length > 1) {
        throw new BadRequestException(
          'Faqat bitta banner rasmi yuklanishi mumkin.',
        );
      }
      const bannerFile = await this.processAndSaveFile(
        documentId,
        files.banner[0],
        'banner',
        FileType.PROPERTY,
        this.propertyUploadFolder,
        this.allowedImageMimeTypes,
      );
      uploadedFiles.push(bannerFile);
    }

    // Handle photos (max 5)
    if (files.photos && files.photos.length > 0) {
      if (files.photos.length > 5) {
        throw new BadRequestException(
          "Ko'pi bilan 5 ta rasm yuklanishi mumkin.",
        );
      }
      for (const photo of files.photos) {
        const photoFile = await this.processAndSaveFile(
          documentId,
          photo,
          'photo',
          FileType.PROPERTY,
          this.propertyUploadFolder,
          this.allowedImageMimeTypes,
        );
        uploadedFiles.push(photoFile);
      }
    }

    // Handle videos (max 5)
    if (files.videos && files.videos.length > 0) {
      if (files.videos.length > 5) {
        throw new BadRequestException(
          "Ko'pi bilan 5 ta video yuklanishi mumkin.",
        );
      }
      for (const video of files.videos) {
        const videoFile = await this.processAndSaveFile(
          documentId,
          video,
          'video',
          FileType.PROPERTY,
          this.propertyUploadFolder,
          this.allowedVideoMimeTypes,
        );
        uploadedFiles.push(videoFile);
      }
    }

    return uploadedFiles;
  }

  async uploadFiles(
    documentId: string,
    documentType: FileType,
    files: { [fieldname: string]: MulterFile[] },
  ): Promise<FileDocument[]> {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new BadRequestException('Yaroqsiz hujjat ID');
    }

    const uploadedFiles: FileDocument[] = [];
    const allowedMimeTypes = [
      ...this.allowedImageMimeTypes,
      ...this.allowedDocumentMimeTypes,
    ];

    for (const key in files) {
      const fileArray = files[key];
      for (const file of fileArray) {
        const savedFile = await this.processAndSaveFile(
          documentId,
          file,
          file.fieldname, // Use the fieldname from multer as the fileKey
          documentType,
          this.sellerUploadFolder,
          allowedMimeTypes,
        );
        uploadedFiles.push(savedFile);
      }
    }

    return uploadedFiles;
  }

  async deleteFilesByDocument(
    documentId: string,
    documentType: FileType,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(documentId)) {
      // No need to throw an error, just log it or return silently
      console.warn('Attempted to delete files with invalid document ID');
      return;
    }

    const filesToDelete = await this.fileModel.find({
      document_id: documentId,
      document_type: documentType,
    });

    if (filesToDelete.length > 0) {
      await Promise.all(
        filesToDelete.map((fileDoc) => this.deleteFileRecordAndFs(fileDoc)),
      );
    }
  }

  private async processAndSaveFile(
    documentId: string,
    file: MulterFile,
    fileKey: string,
    documentType: FileType,
    uploadFolder: string,
    allowedMimeTypes: string[],
  ): Promise<FileDocument> {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Faqat ${allowedMimeTypes.join(', ')} formatlari qabul qilinadi`,
      );
    }

    const maxFileSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        "Fayl hajmi 20MB dan katta bo'lmasligi kerak",
      );
    }

    await fs.mkdir(uploadFolder, { recursive: true });

    const isImage = this.allowedImageMimeTypes.includes(file.mimetype);
    const fileExtension = isImage
      ? 'webp'
      : extname(file.originalname).substring(1).toLowerCase();
    const fileName = `${fileKey}-${uuidv4()}.${fileExtension}`;
    const filePath = join(uploadFolder, fileName);
    const relativeFilePath = join(
      uploadFolder.split(this.baseUploadFolder)[1],
      fileName,
    );

    try {
      let processedBuffer: Buffer;
      let finalMimeType: string;
      let finalSize: number;

      if (isImage) {
        processedBuffer = await sharp(file.buffer)
          .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        finalMimeType = 'image/webp';
        finalSize = processedBuffer.length;
      } else {
        // For videos and documents, save the original buffer
        processedBuffer = file.buffer;
        finalMimeType = file.mimetype;
        finalSize = file.size;
      }

      await fs.writeFile(filePath, processedBuffer);

      const fileRecord = await this.fileModel.create({
        document_id: documentId,
        document_type: documentType,
        file_name: fileName,
        file_path: relativeFilePath,
        mime_type: finalMimeType,
        file_size: finalSize,
        original_name: file.originalname,
        metadata: {
          original_mime_type: file.mimetype,
          original_size: file.size,
          processed: isImage,
          dimensions: isImage ? { width: 800, height: 600 } : undefined,
        },
      });

      return fileRecord;
    } catch (error: unknown) {
      // If anything fails, attempt to delete the orphaned file
      await fs.unlink(filePath).catch(() => {});
      throw new InternalServerErrorException(
        `Faylni qayta ishlashda xato: ${
          error instanceof Error ? error.message : "Noma'lum xato"
        }`,
      );
    }
  }

  private async deleteFileRecordAndFs(fileRecord: FileDocument): Promise<void> {
    const filePath = join(this.baseUploadFolder, fileRecord.file_path);

    await Promise.all([
      fs.unlink(filePath).catch((error: unknown) => {
        console.warn(
          `Faylni o'chirishda xato (ehtimol fayl mavjud emas): ${
            error instanceof Error ? error.message : "Noma'lum xato"
          }`,
        );
      }),
      this.fileModel.findByIdAndDelete(fileRecord._id),
    ]);
  }

  async getUserAvatar(userId: string): Promise<FileDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Yaroqsiz user ID');
    }

    return this.fileModel.findOne({
      document_id: userId,
      document_type: FileType.AVATAR,
    });
  }

  async deleteUserAvatar(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Yaroqsiz user ID');
    }

    const avatar = await this.getUserAvatar(userId);
    if (avatar) {
      await this.deleteFileRecordAndFs(avatar);
    }
  }
}
