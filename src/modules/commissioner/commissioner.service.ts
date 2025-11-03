import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Commissioner, CommissionerDocument } from './commissioner.schema';
import { Model } from 'mongoose';
import { CreateCommissionerDto } from './dto/create-commissioner.dto';
import { MulterFile } from 'src/interfaces/multer-file.interface';
import { UserService } from '../user/user.service';
import { SellerService } from '../seller/seller.service';
import { FileType } from '../file/file.schema';
import { FileService } from '../file/file.service';
import { EnumSellerStatus } from 'src/enums/seller-status.enum';

@Injectable()
export class CommissionerService {
  constructor(
    @InjectModel(Commissioner.name) private model: Model<CommissionerDocument>,
    private readonly userService: UserService,
    private readonly sellerService: SellerService,
    private readonly fileService: FileService,
  ) {}

  async create(
    dto: CreateCommissionerDto & { contract_file: MulterFile; user: string },
  ) {
    const user = await this.userService.findById(dto.user);
    if (!user) throw new NotFoundException('User not found!');

    const seller = await this.sellerService.findSellerByUser(dto.user);
    if (!seller) throw new NotFoundException('Seller not found!');

    if (!dto.contract_file)
      throw new BadRequestException('Shartnoma faylni yuborishingiz shart!');

    const commissioner = await this.model.findOneAndUpdate(
      {
        seller: seller._id,
      },
      {
        ...dto,
        seller: seller._id,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    await this.fileService.deleteFilesByDocument(
      commissioner._id as string,
      FileType.COMMISSIONER,
    );

    await this.fileService.uploadFiles({
      documentId: commissioner._id as string,
      documentType: FileType.COMMISSIONER,
      files: { contract_file: [dto.contract_file] },
    });
    await this.sellerService.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });
    return this.sellerService.findSellerByUser(dto.user);
  }
}
