import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Otp, OtpDocument, OtpTarget } from './otp.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class OtpService {
  constructor(@InjectModel(Otp.name) private model: Model<OtpDocument>) {}
  async create({
    code,
    user,
    target,
  }: {
    code: string;
    user: string;
    target?: OtpTarget;
  }) {
    return this.model.create({
      code,
      user: new Types.ObjectId(user),
      target: target ?? OtpTarget.EMAIL,
    });
  }

  async deleteMany(user: string) {
    return this.model.deleteMany({ user: new Types.ObjectId(user) });
  }

  async findByUser(user: string) {
    return this.model.findOne({ user: new Types.ObjectId(user) });
  }

  async incrementAttempts(user: string) {
    return this.model.findOneAndUpdate(
      { user: new Types.ObjectId(user) },
      { $inc: { attempts: 1 } },
      { new: true },
    );
  }

  async lock(user: string, lockedUntil: Date) {
    return this.model.findOneAndUpdate(
      { user: new Types.ObjectId(user) },
      { $set: { lockedUntil } },
      { new: true },
    );
  }
}
