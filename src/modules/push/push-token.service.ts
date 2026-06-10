import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeviceToken,
  DeviceTokenDocument,
} from './schemas/device-token.schema';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class PushTokenService {
  constructor(
    @InjectModel(DeviceToken.name)
    private readonly model: Model<DeviceTokenDocument>,
  ) {}

  /** Token'ni ro'yxatdan o'tkazadi yoki mavjud bo'lsa yangilaydi. */
  async register(dto: RegisterTokenDto, userId?: string): Promise<DeviceTokenDocument> {
    const update: Record<string, unknown> = { platform: dto.platform };
    if (dto.locale) update.locale = dto.locale;
    if (userId) update.user = new Types.ObjectId(userId);

    return this.model.findOneAndUpdate(
      { token: dto.token },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ) as Promise<DeviceTokenDocument>;
  }

  /** Bitta token'ni o'chiradi (logout / uninstall). */
  async remove(token: string): Promise<void> {
    await this.model.deleteOne({ token });
  }

  /** Userning barcha qurilma token'larini o'chiradi (to'liq logout). */
  async removeAllForUser(userId: string): Promise<void> {
    await this.model.deleteMany({ user: new Types.ObjectId(userId) });
  }

  /** Userga tegishli barcha FCM token'larni qaytaradi. */
  async findTokensByUser(userId: string): Promise<string[]> {
    const docs = await this.model
      .find({ user: new Types.ObjectId(userId) }, { token: 1 })
      .lean();
    return docs.map((d) => d.token);
  }
}
