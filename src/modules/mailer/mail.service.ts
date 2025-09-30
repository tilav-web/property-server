import { BadRequestException, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { FlattenMaps } from 'mongoose';

interface Email {
  email: string;
}

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendOtpEmail({ to, code }: { to: FlattenMaps<Email>; code: string }) {
    const emailAddress = to.email;
    if (typeof emailAddress !== 'string' || !emailAddress.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }
    try {
      await this.mailerService.sendMail({
        to: emailAddress, // Pass the extracted string
        subject: 'Sizning OTP kodingiz',
        template: './otp',
        context: { code },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to send OTP email: ${error}`);
    }
  }
}
