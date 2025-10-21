import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Model } from 'mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateMessageStatusDto } from './dto/create-message-status.dto';
import {
  MessageStatus,
  MessageStatusDocument,
} from './schemas/message-status.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(MessageStatus.name)
    private messageStatusModel: Model<MessageStatusDocument>,
  ) {}

  async findById(id: string) {
    return this.messageModel.findById(id).populate('user').populate('property');
  }

  async findByUser(user: string) {
    return this.messageModel
      .find({ user })
      .populate('user')
      .populate('property');
  }

  async findByProperty(property: string) {
    return this.messageModel
      .find({ property })
      .populate('user')
      .populate('property');
  }

  async create(dto: CreateMessageDto & { user: string }) {
    console.log(dto);

    if (!dto.user) {
      throw new BadRequestException("Ro'yhatdan o'tish kerak!");
    }
    const message = await this.messageModel.create({
      ...dto,
      property: dto.property.toString(),
      user: dto.user.toString(),
    });
    return this.messageModel
      .findById(message._id)
      .populate('user')
      .populate('property');
  }

  async createMessageStatus(dto: CreateMessageStatusDto) {
    return this.messageStatusModel.create(dto);
  }

  async findMessageStatusBySeller({
    seller,
    is_read,
  }: {
    seller: string;
    is_read: boolean;
  }) {
    return this.messageStatusModel
      .find({ is_read, seller: seller.toString() })
      .populate({
        path: 'message',
        populate: [
          {
            path: 'user',
          },
          {
            path: 'property',
          },
        ],
      })
      .populate('seller')
      .lean();
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
}
