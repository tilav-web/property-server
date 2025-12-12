import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { EnumRole } from 'src/enums/role.enum';
import { generateOtp } from 'src/utils/generate-otp';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mailer/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileService } from '../file/file.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private model: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly fileService: FileService,
  ) {}
  async findById(id: string) {
    return this.model.findById(id);
  }

  async login({ email, password }: { email: string; password: string }) {
    if (!email)
      throw new BadRequestException('Email-ni tekshiring. Email kiritilmagan!');
    if (!password) throw new BadRequestException('Parol kiritilmagan!');

    const user = await this.model
      .findOne({
        'email.value': email,
        'email.isVerified': true,
      })
      .select('+password');
    if (!user)
      throw new BadRequestException(
        'Foydalanuvchi mavjut emas. Email-ni tekshiring!',
      );

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new BadRequestException('Parolda xatolik bor!');

    const access_token = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
      },
      { expiresIn: '15m' },
    );

    const refresh_token = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
      },
      { expiresIn: '7d' },
    );

    const { password: _, ...userWithoutPassword } = user.toObject();
    void _;
    return { user: userWithoutPassword, access_token, refresh_token };
  }

  async register({ email, role, password }: CreateUserDto) {
    const existingUser = await this.model.findOne({ 'email.value': email });
    const code = generateOtp();
    const hashPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.email.isVerified) {
        throw new ConflictException(
          'Bu email bilan foydalanuvchi allaqachon mavjud!',
        );
      }
      await this.otpService.deleteMany(existingUser._id as string);
      await this.otpService.create({
        code,
        user: existingUser._id as string,
      });
      existingUser.password = hashPassword;
      existingUser.role = role ?? EnumRole.PHYSICAL;
      const saveUser = await existingUser.save();

      return this.mailService
        .sendOtpEmail({ to: { email: existingUser.email.value }, code })
        .then(() => {
          return { message: 'Tasdiqlash kodi yuborildi!', user: saveUser };
        })
        .catch(() => {
          throw new InternalServerErrorException(
            `Email-ga habar yuborishda xatolik!`,
          );
        });
    }

    const user = await this.model.create({
      email: {
        value: email,
        isVerified: false,
      },
      password: hashPassword,
      role: role ?? EnumRole.PHYSICAL,
    });

    await this.otpService.create({
      code,
      user: user._id as string,
    });

    this.mailService
      .sendOtpEmail({ to: { email: user.email.value }, code })
      .then(() => {
        return { message: 'Tasdiqlash kodi yuborildi!', user };
      })
      .catch(() => {
        throw new InternalServerErrorException(
          `Email-ga habar yuborishda xatolik!`,
        );
      });

    return { message: 'Tasdiqlash kodi yuborildi!', user };
  }

  async confirmOtp({ id, code }: { id: string; code: string }) {
    const otp = await this.otpService.findByUser(id);
    if (!otp)
      throw new BadRequestException(
        'Tasdiqlash kodi eskirgan, undan 1 daqiqa ichida foydalanish kerak!',
      );

    if (otp.code !== code)
      throw new BadRequestException(
        "Tasdiqlash kodida xatolik bor, qayta urinib ko'ring",
      );

    const user = await this.model.findById(id);
    if (!user)
      throw new BadRequestException(
        "Sizga tegishli kod topilmadi, qayta ro'yhatdan o'ting",
      );

    user.email.isVerified = true;
    const saveUser = await user.save();

    await this.otpService.deleteMany(id);

    const access_token = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
      },
      { expiresIn: '15m' },
    );

    const refresh_token = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
      },
      { expiresIn: '7d' },
    );

    return { user: saveUser, access_token, refresh_token };
  }

  async resendOtp(id: string) {
    const user = await this.model.findById(id).lean();
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi!');
    }

    const oldOtp = await this.otpService.findByUser(id);
    if (oldOtp)
      throw new ConflictException(
        `${user.email.value} manziliga kod yuborilgan!`,
      );

    const code = generateOtp();

    // DB ga saqlaymiz
    await this.otpService.create({
      code,
      user: id,
    });

    return this.mailService
      .sendOtpEmail({ to: { email: user.email.value }, code })
      .then(() => {
        return { message: 'Tasdiqlash kodi yuborildi!', user };
      })
      .catch(() => {
        throw new InternalServerErrorException(
          `Email-ga habar yuborishda xatolik!`,
        );
      });
  }

  async refresh(refresh_token: string) {
    const payload = await this.jwtService.verifyAsync<{
      _id: string;
      role: EnumRole;
    }>(refresh_token);

    const access_token = this.jwtService.sign({
      _id: payload._id,
      role: payload.role,
    });

    return access_token;
  }

  async update({
    first_name,
    last_name,
    password,
    phone,
    avatar,
    user,
    lan,
  }: UpdateUserDto & { user: string; avatar?: Express.Multer.File }) {
    const userData = await this.model.findById(user);
    if (!userData) throw new BadRequestException("Tizimdan ro'yhatdan o'ting");

    if (avatar) {
      if (userData.avatar) {
        await this.fileService.deleteFile(userData.avatar);
      }
      userData.avatar = await this.fileService.saveFile({
        file: avatar,
        folder: 'avatars',
      });
    }

    if (first_name) userData.first_name = first_name;
    if (last_name) userData.last_name = last_name;
    if (lan) userData.lan = lan;
    if (phone) userData.phone.value = phone;

    if (password) {
      const hashPassword = await bcrypt.hash(password, 10);
      userData.password = hashPassword;
    }

    const saveUser = await userData.save();

    return saveUser;
  }
}
