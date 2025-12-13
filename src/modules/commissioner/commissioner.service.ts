import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Commissioner, CommissionerDocument } from './commissioner.schema';
import { Model } from 'mongoose';
import { UserService } from '../user/user.service';
import { SellerService } from '../seller/seller.service';
import { FileService } from '../file/file.service';
import { CreateCommissionerDto } from './dto/create-commissioner.dto';
import { EnumSellerStatus } from 'src/enums/seller-status.enum';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';

@Injectable()
export class CommissionerService {
  constructor(
    @InjectModel(Commissioner.name) private model: Model<CommissionerDocument>,
    private readonly userService: UserService,
    private readonly sellerService: SellerService,
    private readonly fileService: FileService,
  ) {}

  async create(
    dto: CreateCommissionerDto & {
      contract_file: Express.Multer.File;
      user: string;
    },
  ) {
    const user = await this.userService.findById(dto.user);
    if (!user) throw new NotFoundException('User not found!');

    const seller = await this.sellerService.findSellerByUser(dto.user);
    if (!seller) throw new NotFoundException('Seller not found!');

    if (!dto.contract_file)
      throw new BadRequestException('Shartnoma faylni yuborishingiz shart!');

    const contractUrl = await this.fileService.saveFile({
      file: dto.contract_file,
      folder: EnumFilesFolder.FILES,
    });

    const commissioner = await this.model.findOneAndUpdate(
      { seller: seller._id },
      {
        ...dto,
        seller: seller._id,
        contract_file: contractUrl,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    if (
      commissioner.contract_file &&
      commissioner.contract_file !== contractUrl
    ) {
      await this.fileService.deleteFile(commissioner.contract_file);
    }

    await this.sellerService.updateSellerStatus({
      id: seller._id as string,
      status: EnumSellerStatus.COMPLETED,
    });

    return this.sellerService.findSellerByUser(dto.user);
  }
}
