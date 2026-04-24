import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EnumLanguage } from 'src/enums/language.enum';
import {
  Inquiry,
  InquiryDocument,
  EnumInquiryStatus,
} from '../schemas/inquiry.schema';
import {
  InquiryResponse,
  InquiryResponseDocument,
} from '../schemas/inquiry-response.schema';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { ChatService } from 'src/modules/chat/chat.service';
import { MessageType } from 'src/modules/chat/enums/message-type.enum';

@Injectable()
export class InquiryService {
  constructor(
    @InjectModel(Inquiry.name) private inquiryModel: Model<InquiryDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(InquiryResponse.name)
    private inquiryResponseModel: Model<InquiryResponseDocument>,
    private readonly chatService: ChatService,
  ) {}

  async create(dto: CreateInquiryDto & { user: string }): Promise<Inquiry> {
    // Check if property exists
    const property = await this.propertyModel.findById(dto.property);
    if (!property) {
      throw new NotFoundException('Mulk topilmadi');
    }

    // Check if the user is the owner of the property
    if (property.author.toString() === dto.user.toString()) {
      throw new ForbiddenException(
        "Siz o'zingizning mulkingizga so'rov yubora olmaysiz",
      );
    }

    const inquiry = await new this.inquiryModel({
      ...dto,
      property: new Types.ObjectId(dto.property),
      seller: property.author,
    }).save();

    // --- Chat integration: shu inquiry chat'da ko'rinadi ---
    try {
      const { conversation } = await this.chatService.findOrCreateConversation(
        String(dto.user),
        String(property.author),
        String(property._id),
      );

      const snippet = this.formatInquirySnippet(dto);
      await this.chatService.createSystemMessage({
        conversationId: conversation._id,
        senderId: String(dto.user),
        type: MessageType.PRICE_OFFER,
        body: snippet,
        metadata: {
          inquiryId: String(inquiry._id),
          inquiryType: dto.type,
          offered_price: dto.offered_price,
          currency: property.currency,
          rental_period: dto.rental_period,
          property: {
            _id: String(property._id),
            price: property.price,
            currency: property.currency,
          },
          comment: dto.comment,
        },
      });
    } catch (err) {
      // Chat xatosi inquiry yaratishni bekor qilmasin
      this.logger.warn(`Chat message for inquiry failed: ${String(err)}`);
    }

    return inquiry;
  }

  private readonly logger = new Logger('InquiryService');

  private formatInquirySnippet(
    dto: CreateInquiryDto & { user: string },
  ): string {
    if (dto.offered_price !== undefined && dto.offered_price !== null) {
      return `Men ${dto.offered_price} taklif qilaman${
        dto.comment ? `: ${dto.comment}` : ''
      }`;
    }
    return dto.comment ?? `Yangi so'rov: ${dto.type}`;
  }

  async findAllForSeller({
    userId,
    language,
  }: {
    userId: string;
    language: EnumLanguage;
  }) {
    const inquiries = await this.inquiryModel
      .aggregate([
        { $match: { seller: new Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'property',
          },
        },
        {
          $lookup: {
            from: 'inquiryresponses',
            localField: '_id',
            foreignField: 'inquiry',
            as: 'response',
          },
        },
        { $unwind: '$user' },
        { $unwind: '$property' },
        {
          $unwind: {
            path: '$response',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            'property.title': {
              $ifNull: [`$property.title.${language}`, '$property.title.en'],
            },
          },
        },
        {
          $project: {
            _id: 1,
            type: 1,
            status: 1,
            offered_price: 1,
            rental_period: 1,
            comment: 1,
            createdAt: 1,
            updatedAt: 1,
            user: {
              _id: '$user._id',
              first_name: '$user.first_name',
              last_name: '$user.last_name',
              email: '$user.email',
              avatar: '$user.avatar',
            },
            property: {
              _id: '$property._id',
              title: '$property.title',
            },
            response: {
              _id: '$response._id',
              status: '$response.status',
              description: '$response.description',
            },
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .exec();

    return inquiries;
  }

  async updateStatus(inquiryId: string, status: EnumInquiryStatus) {
    const inquiry = await this.inquiryModel.findById(inquiryId);
    if (!inquiry) {
      throw new NotFoundException('So‘rov topilmadi');
    }
    inquiry.status = status;
    return inquiry.save();
  }

  async findMyInquiryResponses(userId: string, language: EnumLanguage) {
    const inquiryResponses = await this.inquiryResponseModel
      .aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'inquiries',
            localField: 'inquiry',
            foreignField: '_id',
            as: 'inquiry',
          },
        },
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'property',
          },
        },
        {
          $lookup: {
            from: 'sellers',
            localField: 'seller',
            foreignField: '_id',
            as: 'seller',
          },
        },
        { $unwind: { path: '$inquiry', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'seller.user',
            foreignField: '_id',
            as: 'seller_user',
          },
        },
        {
          $unwind: { path: '$seller_user', preserveNullAndEmptyArrays: true },
        },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            _id: 1,
            status: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            user: 1,
            inquiry: {
              _id: '$inquiry._id',
              type: '$inquiry.type',
              comment: {
                $ifNull: [
                  `$inquiry.comment.${language}`,
                  '$inquiry.comment.en',
                ],
              },
            },
            property: {
              _id: '$property._id',
              title: {
                $ifNull: [`$property.title.${language}`, '$property.title.en'],
              },
              photos: '$property.photos',
            },
            seller: {
              _id: '$seller._id',
              user: {
                _id: '$seller_user._id',
                first_name: '$seller_user.first_name',
                last_name: '$seller_user.last_name',
                avatar: '$seller_user.avatar',
              },
            },
          },
        },
      ])
      .exec();

    return inquiryResponses;
  }
}
