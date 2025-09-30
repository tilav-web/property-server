import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Otp, OtpDocument } from './otp.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class OtpService {
  constructor(@InjectModel(Otp.name) private model: Model<OtpDocument>) {}
  async create({ code, user }: { code: string; user: string }) {
    return this.model.create({ code, user });
  }

  async deleteMany(user: string) {
    return this.model.deleteMany({ user });
  }

  async findByUser(id: string) {
    return this.model.findOne({ user: new Types.ObjectId(id) });
  }
}
