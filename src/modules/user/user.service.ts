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
import { OtpTarget } from '../otp/otp.schema';
import { MailService } from '../mailer/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileService } from '../file/file.service';
import { SmsService, type SmsLanguage } from '../sms/sms.service';

const PHONE_REGEX = /^\+?\d{9,15}$/;

function isPhone(identifier: string): boolean {
  return PHONE_REGEX.test(identifier.replace(/[\s-]/g, ''));
}

function normalizePhone(input: string): string {
  return input.replace(/[^\d]/g, '');
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private model: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly fileService: FileService,
    private readonly smsService: SmsService,
  ) {}

  private signTokens(user: { _id: unknown; role: EnumRole }) {
    const access_token = this.jwtService.sign(
      { _id: user._id, role: user.role, tokenType: 'access' },
      { expiresIn: '15m' },
    );
    const refresh_token = this.jwtService.sign(
      { _id: user._id, role: user.role, tokenType: 'refresh' },
      { expiresIn: '7d' },
    );
    return { access_token, refresh_token };
  }
  async findById(id: string) {
    return this.model.findById(id);
  }

  /**
   * Maxsus AI agent user — barcha chatlarda bitta "bot" sifatida ishlatiladi.
   * Boot paytida yoki kerak bo'lganda yaratiladi. Idempotent.
   */
  async ensureAiAgent(): Promise<UserDocument> {
    const AI_EMAIL = 'ai@amaar.system';
    let ai = await this.model.findOne({ isAI: true });
    if (ai) return ai;

    ai = await this.model.create({
      email: { value: AI_EMAIL, isVerified: true },
      first_name: 'AI',
      last_name: 'Yordamchi',
      avatar: null,
      role: EnumRole.PHYSICAL,
      isAI: true,
    });
    return ai;
  }

  async getAiAgentId(): Promise<string> {
    const ai = await this.ensureAiAgent();
    return String(ai._id);
  }

  async login({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }) {
    if (!identifier)
      throw new BadRequestException('Email yoki telefon kiritilmagan!');

    const usingPhone = isPhone(identifier);
    const query = usingPhone
      ? { 'phone.value': normalizePhone(identifier), 'phone.isVerified': true }
      : { 'email.value': identifier, 'email.isVerified': true };

    const user = await this.model.findOne(query).select('+password');
    if (!user)
      throw new BadRequestException(
        usingPhone
          ? 'Foydalanuvchi topilmadi. Telefonni tekshiring!'
          : 'Foydalanuvchi mavjut emas. Email-ni tekshiring!',
      );

    if (!password || !user.password)
      throw new BadRequestException('Parol kiritilmagan!');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestException('Parolda xatolik bor!');

    const tokens = this.signTokens(user);
    const { password: _, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, ...tokens };
  }

  async register({
    email,
    phone,
    role,
    password,
    language,
  }: CreateUserDto & { language?: SmsLanguage }) {
    if (!email && !phone) {
      throw new BadRequestException(
        'Email yoki telefon raqamlardan birini kiriting!',
      );
    }

    if (email) return this.registerWithEmail({ email, role, password });
    return this.registerWithPhone({
      phone: normalizePhone(phone as string),
      role,
      password,
      language: language ?? 'uz',
    });
  }

  private async registerWithEmail({
    email,
    role,
    password,
  }: {
    email: string;
    role?: EnumRole;
    password: string;
  }) {
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
        target: OtpTarget.EMAIL,
      });
      existingUser.password = hashPassword;
      existingUser.role = role ?? EnumRole.PHYSICAL;
      const saveUser = await existingUser.save();

      try {
        await this.mailService.sendOtpEmail({
          to: { email: existingUser.email.value },
          code,
        });
      } catch {
        throw new InternalServerErrorException(
          'Email-ga habar yuborishda xatolik!',
        );
      }
      return { message: 'Tasdiqlash kodi yuborildi!', user: saveUser };
    }

    const user = await this.model.create({
      email: { value: email, isVerified: false },
      password: hashPassword,
      role: role ?? EnumRole.PHYSICAL,
    });

    await this.otpService.create({
      code,
      user: user._id as string,
      target: OtpTarget.EMAIL,
    });

    try {
      await this.mailService.sendOtpEmail({
        to: { email: user.email.value },
        code,
      });
    } catch {
      throw new InternalServerErrorException(
        'Email-ga habar yuborishda xatolik!',
      );
    }
    return { message: 'Tasdiqlash kodi yuborildi!', user };
  }

  private async registerWithPhone({
    phone,
    role,
    password,
    language,
  }: {
    phone: string;
    role?: EnumRole;
    password: string;
    language: SmsLanguage;
  }) {
    const existingUser = await this.model.findOne({ 'phone.value': phone });
    const code = generateOtp();
    const hashPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.phone.isVerified) {
        throw new ConflictException(
          'Bu telefon bilan foydalanuvchi allaqachon mavjud!',
        );
      }
      await this.otpService.deleteMany(existingUser._id as string);
      await this.otpService.create({
        code,
        user: existingUser._id as string,
        target: OtpTarget.PHONE,
      });
      existingUser.password = hashPassword;
      existingUser.role = role ?? EnumRole.PHYSICAL;
      const saveUser = await existingUser.save();

      try {
        await this.smsService.sendOtp(phone, code, language);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new InternalServerErrorException(
          `SMS yuborishda xatolik: ${detail}`,
        );
      }
      return { message: 'Tasdiqlash kodi yuborildi!', user: saveUser };
    }

    const user = await this.model.create({
      phone: { value: phone, isVerified: false },
      password: hashPassword,
      role: role ?? EnumRole.PHYSICAL,
    });

    await this.otpService.create({
      code,
      user: user._id as string,
      target: OtpTarget.PHONE,
    });

    try {
      await this.smsService.sendOtp(phone, code, language);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `SMS yuborishda xatolik: ${detail}`,
      );
    }
    return { message: 'Tasdiqlash kodi yuborildi!', user };
  }

  async confirmOtp({ id, code }: { id: string; code: string }) {
    const otp = await this.otpService.findByUser(id);
    if (!otp)
      throw new BadRequestException(
        'Tasdiqlash kodi eskirgan, undan 1 daqiqa ichida foydalanish kerak!',
      );

    if (otp.lockedUntil && otp.lockedUntil > new Date()) {
      throw new BadRequestException(
        "Juda ko'p urinish bo'ldi. Yangi kod so'rang yoki birozdan so'ng urinib ko'ring.",
      );
    }

    if (otp.code !== code) {
      const updatedOtp = await this.otpService.incrementAttempts(id);
      if ((updatedOtp?.attempts ?? 0) >= 5) {
        await this.otpService.lock(id, new Date(Date.now() + 60_000));
        throw new BadRequestException(
          "Tasdiqlash kodi 5 marta noto'g'ri kiritildi. Yangi kod so'rang.",
        );
      }

      throw new BadRequestException(
        "Tasdiqlash kodida xatolik bor, qayta urinib ko'ring",
      );
    }

    const user = await this.model.findById(id);
    if (!user)
      throw new BadRequestException(
        "Sizga tegishli kod topilmadi, qayta ro'yhatdan o'ting",
      );

    if (otp.target === OtpTarget.PHONE) {
      user.phone.isVerified = true;
    } else {
      user.email.isVerified = true;
    }
    const saveUser = await user.save();

    await this.otpService.deleteMany(id);
    const tokens = this.signTokens(user);
    return { user: saveUser, ...tokens };
  }

  async resendOtp(id: string, language: SmsLanguage = 'uz') {
    const user = await this.model.findById(id).lean();
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi!');
    }

    const oldOtp = await this.otpService.findByUser(id);
    if (oldOtp) {
      const where =
        oldOtp.target === OtpTarget.PHONE
          ? user.phone?.value
          : user.email?.value;
      throw new ConflictException(`${where} manziliga kod yuborilgan!`);
    }

    // Target ni aniqlaymiz: phone tasdiqlanmagan bo'lsa phone, aks holda email
    const usePhone =
      user.phone?.value && !user.phone.isVerified ? true : false;
    const target = usePhone ? OtpTarget.PHONE : OtpTarget.EMAIL;
    const code = generateOtp();

    await this.otpService.create({ code, user: id, target });

    try {
      if (usePhone && user.phone?.value) {
        await this.smsService.sendOtp(user.phone.value, code, language);
      } else if (user.email?.value) {
        await this.mailService.sendOtpEmail({
          to: { email: user.email.value },
          code,
        });
      } else {
        throw new BadRequestException(
          'Foydalanuvchida email yoki telefon mavjud emas',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const detail = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        usePhone
          ? `SMS yuborishda xatolik: ${detail}`
          : `Email yuborishda xatolik: ${detail}`,
      );
    }

    return { message: 'Tasdiqlash kodi yuborildi!', user };
  }

  async forgotPassword(identifier: string, language: SmsLanguage = 'uz') {
    if (!identifier) {
      throw new BadRequestException('Email yoki telefon kiritilmagan!');
    }

    const usingPhone = isPhone(identifier);
    const query = usingPhone
      ? {
          'phone.value': normalizePhone(identifier),
          'phone.isVerified': true,
        }
      : { 'email.value': identifier, 'email.isVerified': true };

    const user = await this.model.findOne(query);
    if (!user) {
      throw new NotFoundException(
        usingPhone
          ? 'Bu telefon bilan tasdiqlangan foydalanuvchi topilmadi!'
          : 'Bu email bilan tasdiqlangan foydalanuvchi topilmadi!',
      );
    }

    const oldOtp = await this.otpService.findByUser(user._id as string);
    if (oldOtp) {
      throw new ConflictException('Kod yuborilgan! 1 daqiqa kuting.');
    }

    const code = generateOtp();
    const target = usingPhone ? OtpTarget.PHONE : OtpTarget.EMAIL;

    await this.otpService.create({
      code,
      user: user._id as string,
      target,
    });

    try {
      if (usingPhone) {
        await this.smsService.sendOtp(
          user.phone.value as string,
          code,
          language,
        );
      } else {
        await this.mailService.sendOtpEmail({
          to: { email: user.email.value },
          code,
        });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        usingPhone
          ? `SMS yuborishda xatolik: ${detail}`
          : `Email yuborishda xatolik: ${detail}`,
      );
    }

    return {
      message: 'Parolni tiklash kodi yuborildi!',
      userId: user._id,
    };
  }

  async resetPassword({
    userId,
    code,
    newPassword,
  }: {
    userId: string;
    code: string;
    newPassword: string;
  }) {
    const otp = await this.otpService.findByUser(userId);
    if (!otp) {
      throw new BadRequestException(
        'Tasdiqlash kodi eskirgan, qaytadan urinib koring!',
      );
    }

    if (otp.lockedUntil && otp.lockedUntil > new Date()) {
      throw new BadRequestException(
        "Juda ko'p urinish bo'ldi. Yangi kod so'rang yoki birozdan so'ng urinib ko'ring.",
      );
    }

    if (otp.code !== code) {
      const updatedOtp = await this.otpService.incrementAttempts(userId);
      if ((updatedOtp?.attempts ?? 0) >= 5) {
        await this.otpService.lock(userId, new Date(Date.now() + 60_000));
        throw new BadRequestException(
          "Tasdiqlash kodi 5 marta noto'g'ri kiritildi. Yangi kod so'rang.",
        );
      }
      throw new BadRequestException(
        "Tasdiqlash kodida xatolik bor, qayta urinib ko'ring",
      );
    }

    const user = await this.model.findById(userId);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi!');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await this.otpService.deleteMany(userId);

    return { message: 'Parol muvaffaqiyatli yangilandi!' };
  }

  async refresh(refresh_token: string) {
    const payload = await this.jwtService.verifyAsync<{
      _id: string;
      role: EnumRole;
      tokenType: string;
    }>(refresh_token);

    if (payload.tokenType !== 'refresh') {
      throw new BadRequestException("Noto'g'ri token turi!");
    }

    const access_token = this.jwtService.sign(
      {
        _id: payload._id,
        role: payload.role,
        tokenType: 'access',
      },
      { expiresIn: '15m' },
    );

    return access_token;
  }

  async socialLogin(req) {
    if (!req.user) {
      throw new BadRequestException('Foydalanuvchi topilmadi!');
    }

    const { email, firstName, lastName, picture, provider, providerId } =
      req.user;

    let user = await this.model.findOne({ 'email.value': email });

    if (!user) {
      user = await this.model.create({
        email: {
          value: email,
          isVerified: true,
        },
        first_name: firstName,
        last_name: lastName,
        avatar: picture,
        provider: provider,
        socialAccounts: [{ provider, providerId, isVerified: true }],
      });
    } else {
      const socialAccount = user.socialAccounts.find(
        (sa) => sa.provider === provider,
      );
      if (!socialAccount) {
        user.socialAccounts.push({ provider, providerId, isVerified: true });
        await user.save();
      }
    }

    const access_token = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
        tokenType: 'access',
      },
      { expiresIn: '15m' },
    );

    const refresh_token = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
        tokenType: 'refresh',
      },
      { expiresIn: '7d' },
    );

    return { user, access_token, refresh_token };
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
