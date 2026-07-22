import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Workbook } from 'exceljs';
import { User, UserDocument } from '../../user/user.schema';
import { FindUsersDto } from '../dto/find-users.dto';
import { ExportUsersDto } from '../dto/export-users.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { FileService } from '../../file/file.service';
import { EnumFilesFolder } from 'src/modules/file/enums/files-folder.enum';
import { UserService } from '../../user/user.service';
import { EnumRole } from 'src/enums/role.enum';
import { normalizePhone } from 'src/utils/normalize-phone';

const ROLE_LABELS: Record<EnumRole, string> = {
  [EnumRole.PHYSICAL]: 'Jismoniy shaxs',
  [EnumRole.LEGAL]: 'Yuridik shaxs',
};

@Injectable()
export class AdminUserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly fileService: FileService,
    private readonly userService: UserService,
  ) {}

  /** Super admin tomonidan qo'lda foydalanuvchi qo'shish — OTP shart emas. */
  async createUser(dto: CreateUserDto) {
    const emailValue = dto.emailValue?.trim().toLowerCase();
    const phoneValue = dto.phoneValue
      ? normalizePhone(dto.phoneValue)
      : undefined;

    if (!emailValue && !phoneValue) {
      throw new BadRequestException(
        'Email yoki telefon raqamlaridan birini kiriting!',
      );
    }

    if (emailValue) {
      const exists = await this.userModel.findOne({
        'email.value': emailValue,
      });
      if (exists) {
        throw new ConflictException(
          'Bu email bilan foydalanuvchi allaqachon mavjud!',
        );
      }
    }

    if (phoneValue) {
      const exists = await this.userModel.findOne({
        'phone.value': phoneValue,
      });
      if (exists) {
        throw new ConflictException(
          'Bu telefon bilan foydalanuvchi allaqachon mavjud!',
        );
      }
    }

    const password = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    return this.userModel.create({
      first_name: dto.first_name,
      last_name: dto.last_name,
      role: dto.role ?? EnumRole.PHYSICAL,
      lan: dto.lan,
      email: emailValue
        ? { value: emailValue, isVerified: Boolean(dto.emailIsVerified) }
        : undefined,
      phone: phoneValue
        ? { value: phoneValue, isVerified: Boolean(dto.phoneIsVerified) }
        : undefined,
      password,
    });
  }

  private buildUsersFilter(
    dto: Pick<FindUsersDto, 'role' | 'search' | 'isPremium'>,
  ): FilterQuery<UserDocument> {
    const { role, search, isPremium } = dto;
    const filter: FilterQuery<UserDocument> = {};

    if (role) {
      filter.role = role;
    }

    if (isPremium === true) {
      filter.premiumUntil = { $gt: new Date() };
    } else if (isPremium === false) {
      filter.$and = [
        {
          $or: [
            { premiumUntil: { $exists: false } },
            { premiumUntil: null },
            { premiumUntil: { $lte: new Date() } },
          ],
        },
      ];
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchOr = [
        { first_name: searchRegex },
        { last_name: searchRegex },
        { 'email.value': searchRegex },
        { 'phone.value': searchRegex },
      ];
      if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else {
        filter.$or = searchOr;
      }
    }

    return filter;
  }

  async findUsers(dto: FindUsersDto) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;
    const filter = this.buildUsersFilter(dto);

    const users = await this.userModel
      .find(filter)
      .sort({ createdAt: -1 })
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

  /** Filtrlarga mos foydalanuvchilar ro'yxatini Excel (.xlsx) buferga eksport qiladi. */
  async exportUsers(dto: ExportUsersDto): Promise<Buffer> {
    const filter = this.buildUsersFilter(dto);
    const users = await this.userModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Foydalanuvchilar');

    sheet.columns = [
      { header: '№', key: 'index', width: 6 },
      { header: 'Ism', key: 'first_name', width: 18 },
      { header: 'Familya', key: 'last_name', width: 18 },
      { header: 'Telefon', key: 'phone', width: 18 },
      { header: 'Telefon tasdiqlangan', key: 'phoneVerified', width: 18 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Email tasdiqlangan', key: 'emailVerified', width: 16 },
      { header: 'Rol', key: 'role', width: 16 },
      { header: 'Premium holati', key: 'premium', width: 20 },
      { header: 'Til', key: 'lan', width: 8 },
      { header: 'Instagram', key: 'instagram', width: 18 },
      { header: 'Telegram', key: 'telegram', width: 18 },
      { header: 'WhatsApp', key: 'whatsapp', width: 18 },
      { header: "Ro'yxatdan o'tgan sana", key: 'createdAt', width: 20 },
      { header: 'ID', key: 'id', width: 26 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const now = new Date();
    users.forEach((user, i) => {
      const isPremiumActive = Boolean(
        user.premiumUntil && user.premiumUntil > now,
      );
      const createdAt = (user as UserDocument & { createdAt?: Date }).createdAt;
      sheet.addRow({
        index: i + 1,
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        phone: user.phone?.value ?? '',
        phoneVerified: user.phone?.isVerified ? 'Ha' : "Yo'q",
        email: user.email?.value ?? '',
        emailVerified: user.email?.isVerified ? 'Ha' : "Yo'q",
        role: ROLE_LABELS[user.role] ?? user.role,
        premium: isPremiumActive
          ? `Faol (${user.premiumUntil!.toLocaleDateString('uz-UZ')} gacha)`
          : "Yo'q",
        lan: user.lan ?? '',
        instagram: user.instagram ?? '',
        telegram: user.telegram ?? '',
        whatsapp: user.whatsapp ?? '',
        createdAt: createdAt ? createdAt.toLocaleString('uz-UZ') : '',
        id: String(user._id),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
      user.phone.value = normalizePhone(dto.phoneValue);
    }
    if (dto.phoneIsVerified !== undefined) {
      if (!user.phone) user.phone = { value: '', isVerified: false };
      user.phone.isVerified = dto.phoneIsVerified;
    }

    return user.save();
  }

  async deleteUser(userId: string): Promise<void> {
    return this.userService.deleteAccount(userId);
  }
}
