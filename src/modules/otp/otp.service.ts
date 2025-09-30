import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Otp, OtpDocument } from './otp.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class OtpService {
  constructor(@InjectModel(Otp.name) private model: Model<OtpDocument>) {}
  async create({ code, user }: { code: string; user: string }) {
    return this.model.create({ code, user: new Types.ObjectId(user) });
  }

  async deleteMany(user: string) {
    return this.model.deleteMany({ user: new Types.ObjectId(user) });
  }

  async findByUser(user: string) {
    return this.model.findOne({ user: new Types.ObjectId(user) });
  }
}
