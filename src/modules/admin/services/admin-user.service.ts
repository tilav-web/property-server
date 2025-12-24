import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { User, UserDocument } from '../../user/user.schema';
import { FindUsersDto } from '../dto/find-users.dto';

@Injectable()
export class AdminUserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findUsers(dto: FindUsersDto) {
    const { page = 1, limit = 10, role, search } = dto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<UserDocument> = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { first_name: searchRegex },
        { last_name: searchRegex },
        { 'email.value': searchRegex },
        { 'phone.value': searchRegex },
      ];
    }

    const users = await this.userModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.userModel.countDocuments(filter);

    const hasMore = page < total / limit;

    return {
      users,
      total,
      page,
      limit,
      hasMore,
    };
  }
}
