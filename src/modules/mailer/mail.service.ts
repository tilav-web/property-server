import { BadRequestException, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

interface Email {
  email: string;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendOtpEmail({ to, code }: { to: Email; code: string }) {
    const emailAddress = to.email;
    if (typeof emailAddress !== 'string' || !emailAddress.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }
    return await this.mailerService
      .sendMail({
        to: emailAddress, // Pass the extracted string
        subject: 'Sizning OTP kodingiz',
        template: './otp',
        context: { code },
      })
      .then(() => {
        return { message: 'Habar yuborildi' };
      })
      .catch((error) => {
        throw new BadRequestException(`Failed to send OTP email: ${error}`);
      });
  }
}
