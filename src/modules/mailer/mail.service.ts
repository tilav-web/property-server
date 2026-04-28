import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

interface Email {
  email: string;
}

interface ProjectInquiryEmail {
  to: string[];
  projectName: string;
  fullName: string;
  contactMethod: string;
  email?: string;
  phone?: string;
  message?: string;
  adminLink?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOtpEmail({ to, code }: { to: Email; code: string }) {
    const emailAddress = to.email;
    if (typeof emailAddress !== 'string' || !emailAddress.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }
    return await this.mailerService
      .sendMail({
        to: emailAddress,
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

  async sendProjectInquiry(payload: ProjectInquiryEmail) {
    const recipients = payload.to.filter(
      (e) => typeof e === 'string' && e.includes('@'),
    );
    if (recipients.length === 0) {
      this.logger.warn('Project inquiry email skipped: no valid recipients');
      return { message: 'No recipients' };
    }
    try {
      await this.mailerService.sendMail({
        to: recipients,
        subject: `Yangi loyiha so'rovi: ${payload.projectName}`,
        template: './project-inquiry',
        context: {
          projectName: payload.projectName,
          fullName: payload.fullName,
          contactMethod: payload.contactMethod,
          email: payload.email,
          phone: payload.phone,
          message: payload.message,
          adminLink: payload.adminLink,
        },
      });
      return { message: 'Email yuborildi' };
    } catch (err) {
      this.logger.error('Failed to send project inquiry email', err as Error);
      return { message: 'Email failed' };
    }
  }
}
