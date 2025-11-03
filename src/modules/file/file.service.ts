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

  private readonly folderMap: Record<string, string> = {
    [FileType.AVATAR]: this.avatarUploadFolder,
    [FileType.PROPERTY]: this.propertyUploadFolder,
    [FileType.ADVERTISE]: this.propertyUploadFolder,
    [FileType.YTT_SELLER]: this.sellerUploadFolder,
    [FileType.MCHJ_SELLER]: this.sellerUploadFolder,
    [FileType.SELF_EMPLOYED_SELLER]: this.sellerUploadFolder,
    [FileType.COMMISSIONER]: this.sellerUploadFolder,
    [FileType.PHYSICAL_SELLER]: this.sellerUploadFolder,
  };

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

  async uploadFiles({
    documentId,
    documentType,
    files,
  }: {
    documentId: string;
    documentType: FileType;
    files: { [fieldname: string]: MulterFile[] };
  }): Promise<FileDocument[]> {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new BadRequestException('Yaroqsiz hujjat ID');
    }

    const uploadedFiles: FileDocument[] = [];
    const allowedMimeTypes = [
      ...this.allowedImageMimeTypes,
      ...this.allowedDocumentMimeTypes,
      ...this.allowedVideoMimeTypes, // Allow videos
    ];

    // Determine upload folder based on document type
    const uploadFolder = this.folderMap[documentType] || this.sellerUploadFolder;

    for (const key in files) {
      const fileArray = files[key];
      for (const file of fileArray) {
        const savedFile = await this.processAndSaveFile(
          documentId,
          file,
          key, // Use the key from the files object
          documentType,
          uploadFolder, // Use the dynamically determined folder
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
    console.log('--- Starting processAndSaveFile ---');
    console.log(`Document ID: ${documentId}, FileKey: ${fileKey}, DocumentType: ${documentType}`);

    if (!allowedMimeTypes.includes(file.mimetype)) {
      console.error(`Disallowed mimetype: ${file.mimetype}`);
      throw new BadRequestException(
        `Faqat ${allowedMimeTypes.join(', ')} formatlari qabul qilinadi`,
      );
    }

    const maxFileSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxFileSize) {
      console.error(`File size too large: ${file.size}`);
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

    console.log(`Generated fileName: ${fileName}`);
    console.log(`Attempting to write file to: ${filePath}`);

    try {
      let processedBuffer: Buffer;
      let finalMimeType: string;
      let finalSize: number;

      if (isImage) {
        console.log('Processing as image...');
        processedBuffer = await sharp(file.buffer)
          .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        finalMimeType = 'image/webp';
        finalSize = processedBuffer.length;
      } else {
        console.log('Processing as non-image file...');
        processedBuffer = file.buffer;
        finalMimeType = file.mimetype;
        finalSize = file.size;
      }

      console.log('Writing file to disk...');
      await fs.writeFile(filePath, processedBuffer);
      console.log('--- File successfully written to disk ---');

      const fileDataToCreate = {
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
      };

      console.log('Creating file record in database with data:', fileDataToCreate);
      const fileRecord = await this.fileModel.create(fileDataToCreate);
      console.log('--- File record successfully created in DB ---', fileRecord);

      return fileRecord;
    } catch (error: unknown) {
      console.error('--- ERROR in processAndSaveFile ---', error);
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
