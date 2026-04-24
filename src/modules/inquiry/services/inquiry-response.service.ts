import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { ChatService } from 'src/modules/chat/chat.service';
import { MessageType } from 'src/modules/chat/enums/message-type.enum';

@Injectable()
export class InquiryResponseService {
  private readonly logger = new Logger(InquiryResponseService.name);

  constructor(
    @InjectModel(InquiryResponse.name)
    private readonly inquiryResponseModel: Model<InquiryResponseDocument>,
    @InjectModel(Seller.name)
    private readonly sellerModel: Model<SellerDocument>,
    @InjectModel(Inquiry.name)
    private readonly inquiryModel: Model<InquiryDocument>,
    private readonly inquiryService: InquiryService,
    private readonly chatService: ChatService,
  ) {}

  async create(
    dto: CreateInquiryResponseDto,
    userId: string,
  ): Promise<InquiryResponse> {
    const inquiry = await this.inquiryModel.findById(dto.inquiryId);
    if (!inquiry) {
      throw new NotFoundException("So'rov topilmadi");
    }

    if (inquiry.seller.toString() !== userId.toString()) {
      throw new ForbiddenException("Bu so'rovga javob berish huquqi yo'q");
    }

    const existing = await this.inquiryResponseModel.findOne({
      inquiry: inquiry._id,
    });
    if (existing) {
      throw new BadRequestException(
        "Ushbu so'rovga allaqachon javob berilgan",
      );
    }

    const seller = await this.sellerModel.findOne({
      user: new Types.ObjectId(userId),
    });
    if (!seller) {
      throw new NotFoundException('Sotuvchi topilmadi');
    }

    const response = await this.inquiryResponseModel.create({
      status: dto.status,
      description: dto.description,
      user: inquiry.user,
      inquiry: inquiry._id,
      property: inquiry.property,
      seller: seller._id,
    });

    const inquiryStatus =
      dto.status === EnumInquiryResponseStatus.APPROVED
        ? EnumInquiryStatus.ACCEPTED
        : EnumInquiryStatus.REJECTED;

    await this.inquiryService.updateStatus(
      String(inquiry._id),
      inquiryStatus,
    );

    // --- Chat'ga SYSTEM message yuborish — buyer chatda javob ko'radi ---
    try {
      const { conversation } = await this.chatService.findOrCreateConversation(
        String(inquiry.user),
        userId,
        String(inquiry.property),
      );
      const prefix =
        dto.status === EnumInquiryResponseStatus.APPROVED
          ? '✅ Taklif qabul qilindi'
          : '❌ Taklif rad etildi';
      const body = dto.description
        ? `${prefix}: ${dto.description}`
        : prefix;

      await this.chatService.createSystemMessage({
        conversationId: conversation._id,
        senderId: userId,
        type: MessageType.SYSTEM,
        body,
        metadata: {
          inquiryId: String(inquiry._id),
          responseStatus: dto.status,
          description: dto.description,
        },
      });
    } catch (err) {
      this.logger.warn(`Chat response message failed: ${String(err)}`);
    }

    return response;
  }
}
