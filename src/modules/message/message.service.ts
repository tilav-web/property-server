import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from './message.schema';
import { Model } from 'mongoose';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private model: Model<MessageDocument>,
  ) {}

  async findById(id: string) {
    return this.model.findById(id).populate('user').populate('property');
  }

  async findByUser(user: string) {
    return this.model.find({ user }).populate('user').populate('property');
  }

  async findByProperty(property: string) {
    return this.model.find({ property }).populate('user').populate('property');
  }

  async create(dto: CreateMessageDto & { user: string }) {
    if (!dto.user) {
      throw new BadRequestException("Ro'yhatdan o'tish kerak!");
    }

    const message = await this.model.create(dto);

    // endi populate qilamiz
    return this.model
      .findById(message._id)
      .populate('user')
      .populate('property');
  }

  async delete({ id, user }: { id: string; user: string }) {
    if (!id || !user) {
      throw new BadRequestException("Habarni o'chirib bo'lmadi!");
    }

    const deleted = await this.model.findOneAndDelete({ _id: id, user });

    if (!deleted) {
      throw new NotFoundException(
        "Habar topilmadi yoki o'chirishga ruxsat yo'q!",
      );
    }

    return deleted;
  }
}
