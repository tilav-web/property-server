import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { User, UserDocument } from '../../user/user.schema';
import { FindUsersDto } from '../dto/find-users.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FileService } from '../../file/file.service';
import { EnumFilesFolder } from 'src/modules/file/enums/files-folder.enum';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly fileService: FileService,
  ) {}

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

  async update(
    userId: string,
    dto: UpdateUserDto,
    avatarFile?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Handle avatar update
    if (avatarFile) {
      if (user.avatar) {
        await this.fileService.deleteFile(user.avatar);
      }
      const [newAvatarPath] = await this.fileService.saveFiles({
        files: [avatarFile],
        folder: EnumFilesFolder.AVATARS,
      });
      user.avatar = newAvatarPath;
    } else if (dto.avatar === null) {
      // If dto.avatar is explicitly null, it means frontend wants to remove existing avatar
      if (user.avatar) {
        await this.fileService.deleteFile(user.avatar);
      }
      user.avatar = '';
    }

    // Update basic fields
    if (dto.first_name !== undefined) user.first_name = dto.first_name;
    if (dto.last_name !== undefined) user.last_name = dto.last_name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.lan !== undefined) user.lan = dto.lan;

    // Update nested email identifier
    if (dto.emailValue !== undefined) {
      user.email.value = dto.emailValue;
    }
    if (dto.emailIsVerified !== undefined) {
      user.email.isVerified = dto.emailIsVerified;
    }

    // Update nested phone identifier
    if (dto.phoneValue !== undefined) {
      if (!user.phone) user.phone = { value: '', isVerified: false };
      user.phone.value = dto.phoneValue;
    }
    if (dto.phoneIsVerified !== undefined) {
      if (!user.phone) user.phone = { value: '', isVerified: false };
      user.phone.isVerified = dto.phoneIsVerified;
    }

    return user.save();
  }
}
