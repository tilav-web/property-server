import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Model, Types } from 'mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateMessageStatusDto } from './dto/create-message-status.dto';
import {
  MessageStatus,
  MessageStatusDocument,
} from './schemas/message-status.schema';
import { EnumLanguage } from 'src/enums/language.enum';

type RatingsAggResult = {
  _id: string; // property id
  totalMessages: number;
  avgRating: number;
};

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(MessageStatus.name)
    private messageStatusModel: Model<MessageStatusDocument>,
  ) { }

  async findById(id: string) {
    return this.messageModel.findById(id).populate('user').populate('property');
  }

  async findByUser(user: string) {
    return this.messageModel
      .find({ user })
      .populate('user')
      .populate('property');
  }

  async findByProperty(property: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;
    const messages = await this.messageModel
      .find({ property: new Types.ObjectId(property) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'first_name last_name avatar')
      .lean()
      .exec();

    const total = await this.messageModel.countDocuments({
      property: new Types.ObjectId(property),
    });

    return {
      data: messages,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async create(
    dto: CreateMessageDto & { user: string },
  ): Promise<{ message: MessageDocument | null; rating: number }> {
    if (!dto.user) {
      throw new NotFoundException('User not found!');
    }

    const hasMessage = await this.messageModel.findOne({
      property: new Types.ObjectId(dto.property),
      user: new Types.ObjectId(dto.user),
    });

    console.log(dto);


    if (hasMessage)
      throw new BadRequestException('Bu property uchun fikr bildirgansiz!');

    const message = await this.messageModel.create({
      ...dto,
      property: new Types.ObjectId(dto.property),
      user: new Types.ObjectId(dto.user),
    });



    const ratings = await this.messageModel.aggregate<RatingsAggResult>([
      { $match: { property: message.property } },
      {
        $group: {
          _id: '$property',
          totalMessages: { $sum: 1 },
          avgRating: { $avg: '$rating' }, // o'rtacha rating
        },
      },
    ]);

    const avgRating = ratings[0]?.avgRating || 0;

    const resMessage = await this.messageModel
      .findById(message._id)
      .populate('user')
      .populate('property');

    return { message: resMessage, rating: avgRating };
  }

  async createMessageStatus(dto: CreateMessageStatusDto) {
    return this.messageStatusModel.create({
      ...dto,
      message: new Types.ObjectId(dto.message),
      seller: new Types.ObjectId(dto.seller),
    });
  }

  async findMessageStatusBySeller({
    seller,
    language,
  }: {
    seller: string;
    language: EnumLanguage;
  }): Promise<any[]> {
    const messages = await this.messageStatusModel.aggregate([
      { $match: { seller: new Types.ObjectId(seller) } },

      // message join
      {
        $lookup: {
          from: 'messages',
          localField: 'message',
          foreignField: '_id',
          as: 'message',
        },
      },
      { $unwind: '$message' },
      {
        $lookup: {
          from: 'users',
          localField: 'message.user',
          foreignField: '_id',
          as: 'message.user',
        },
      },
      { $unwind: '$message.user' },
      {
        $lookup: {
          from: 'properties',
          localField: 'message.property',
          foreignField: '_id',
          as: 'property',
        },
      },
      { $unwind: '$property' },

      // 🔥 message ning qolgan fieldlarini saqlaymiz, property dan faqat title olamiz
      {
        $addFields: {
          'message.property': {
            title: `$property.title.${language}`,
          },
        },
      },

      { $sort: { createdAt: -1 } },
    ]);

    return messages;
  }

  async delete({ id, user }: { id: string; user: string }) {
    if (!id || !user) {
      throw new BadRequestException("Habarni o'chirib bo'lmadi!");
    }

    const deleted = await this.messageModel.findOneAndDelete({ _id: id, user });

    if (!deleted) {
      throw new NotFoundException(
        "Habar topilmadi yoki o'chirishga ruxsat yo'q!",
      );
    }

    return deleted;
  }

  async deleteStatusMessageById(id: string) {
    return this.messageStatusModel.findByIdAndDelete(id);
  }

  async deleteStatusMessageAll(seller: string) {
    return this.messageStatusModel.deleteMany({ seller, is_read: true });
  }

  async readMessageStatus(id: string) {
    return this.messageStatusModel
      .findByIdAndUpdate(id, { is_read: true })
      .populate('seller')
      .sort({ createdAt: -1 })
      .lean();
  }

  async readMessageStatusAll(seller: string) {
    return this.messageStatusModel
      .updateMany({ seller }, { is_read: true })
      .populate('seller')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findMessageUnread(seller: string) {
    return this.messageStatusModel
      .find({
        seller: seller.toString(),
        is_read: false,
      })
      .populate('seller')
      .sort({ createdAt: -1 })
      .lean();
  }
}
