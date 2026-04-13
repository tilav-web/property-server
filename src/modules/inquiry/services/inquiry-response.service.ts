import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  InquiryResponse,
  InquiryResponseDocument,
  EnumInquiryResponseStatus,
} from '../schemas/inquiry-response.schema';
import { CreateInquiryResponseDto } from '../dto/create-inquiry-response.dto';
import { InquiryService } from './inquiry.service';
import {
  EnumInquiryStatus,
  Inquiry,
  InquiryDocument,
} from '../schemas/inquiry.schema';
import {
  Seller,
  SellerDocument,
} from 'src/modules/seller/schemas/seller.schema';

@Injectable()
export class InquiryResponseService {
  constructor(
    @InjectModel(InquiryResponse.name)
    private readonly inquiryResponseModel: Model<InquiryResponseDocument>,
    @InjectModel(Seller.name)
    private readonly sellerModel: Model<SellerDocument>,
    @InjectModel(Inquiry.name)
    private readonly inquiryModel: Model<InquiryDocument>,
    private readonly inquiryService: InquiryService,
  ) {}

  async create(
    dto: CreateInquiryResponseDto,
    id: string,
  ): Promise<InquiryResponse> {
    const seller = await this.sellerModel.findOne({
      user: new Types.ObjectId(id),
    });

    if (!seller) {
      throw new NotFoundException('Sotuvchi topilmadi');
    }

    const inquiry = await this.inquiryModel.findById(dto.inquiry);
    if (!inquiry) {
      throw new NotFoundException("So'rov topilmadi");
    }

    if (inquiry.seller.toString() !== id.toString()) {
      throw new ForbiddenException("Bu so'rovga javob berish huquqi yo'q");
    }

    if (
      inquiry.user.toString() !== dto.user.toString() ||
      inquiry.property.toString() !== dto.property.toString()
    ) {
      throw new BadRequestException("So'rov ma'lumotlari mos kelmadi");
    }

    const newInquiryResponse = new this.inquiryResponseModel({
      ...dto,
      user: new Types.ObjectId(dto.user),
      inquiry: new Types.ObjectId(dto.inquiry),
      property: new Types.ObjectId(dto.property),
      seller: seller._id,
    });

    const inquiryStatus =
      dto.status === EnumInquiryResponseStatus.APPROVED
        ? EnumInquiryStatus.ACCEPTED
        : EnumInquiryStatus.REJECTED;

    await this.inquiryService.updateStatus(
      dto.inquiry.toString(),
      inquiryStatus,
    );

    return newInquiryResponse.save();
  }
}
