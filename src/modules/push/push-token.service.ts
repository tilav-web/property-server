import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeviceToken,
  DeviceTokenDocument,
} from './schemas/device-token.schema';
import { RegisterTokenDto } from './dto/register-token.dto';
import { User, UserDocument } from '../user/user.schema';

@Injectable()
export class PushTokenService {
  constructor(
    @InjectModel(DeviceToken.name)
    private readonly model: Model<DeviceTokenDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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

  /** Ro'yxatdan o'tgan barcha userlarning tokenlarini qaytaradi. */
  async findAllUserTokens(): Promise<string[]> {
    const docs = await this.model
      .find({ user: { $ne: null } }, { token: 1 })
      .lean();
    return docs.map((d) => d.token);
  }

  /** Faol premium'li userlarning tokenlarini qaytaradi. */
  async findPremiumUserTokens(): Promise<string[]> {
    const premiumUsers = await this.userModel
      .find({ premiumUntil: { $gt: new Date() } }, { _id: 1 })
      .lean();
    if (premiumUsers.length === 0) return [];
    const ids = premiumUsers.map((u) => u._id);
    const docs = await this.model
      .find({ user: { $in: ids } }, { token: 1 })
      .lean();
    return docs.map((d) => d.token);
  }
}
