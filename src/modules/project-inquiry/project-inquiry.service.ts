import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProjectInquiry,
  ProjectInquiryDocument,
  EnumProjectInquiryStatus,
  EnumContactMethod,
} from './project-inquiry.schema';
import { CreateProjectInquiryDto } from './dto/create-project-inquiry.dto';
import { Project, ProjectDocument } from '../project/project.schema';
import { Admin, AdminDocument } from '../admin/admin.schema';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { MailService } from '../mailer/mail.service';

@Injectable()
export class ProjectInquiryService {
  private readonly logger = new Logger(ProjectInquiryService.name);

  constructor(
    @InjectModel(ProjectInquiry.name)
    private readonly model: Model<ProjectInquiryDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
  ) {}

  async create({
    dto,
    userId,
  }: {
    dto: CreateProjectInquiryDto;
    userId?: string;
  }) {
    if (!Types.ObjectId.isValid(dto.project)) {
      throw new BadRequestException('Noto‘g‘ri loyiha ID');
    }
    const project = await this.projectModel.findById(dto.project).lean();
    if (!project) throw new NotFoundException('Loyiha topilmadi');

    const inquiry = await this.model.create({
      ...dto,
      project: new Types.ObjectId(dto.project),
      user: userId ? new Types.ObjectId(userId) : undefined,
    });

    // Adminlarga in-app notification + email yuboramiz
    try {
      const admins = await this.adminModel
        .find({}, { _id: 1, email: 1 })
        .lean();
      const channelLabel = this.contactLabel(dto.contact_method);

      await Promise.all(
        admins.map((a) =>
          this.notificationService.create({
            user: String(a._id),
            type: NotificationType.PROJECT_INQUIRY,
            title: `Yangi loyiha so'rovi: ${project.name}`,
            body: `${dto.full_name} — ${channelLabel}`,
            link: `/admin/project-inquiries`,
            payload: {
              inquiryId: String(inquiry._id),
              projectId: String(project._id),
              method: dto.contact_method,
            },
          }),
        ),
      );

      const adminEmails = admins
        .map((a) => a.email)
        .filter((e): e is string => typeof e === 'string' && e.includes('@'));

      if (adminEmails.length > 0) {
        await this.mailService.sendProjectInquiry({
          to: adminEmails,
          projectName: project.name,
          fullName: dto.full_name,
          contactMethod: channelLabel,
          email: dto.email,
          phone: dto.phone,
          message: dto.message,
          adminLink: `${process.env.CLIENT_URL ?? ''}/admin/project-inquiries`,
        });
      }
    } catch (err) {
      this.logger.warn(`ProjectInquiry notification failed: ${String(err)}`);
    }

    return inquiry;
  }

  async listForAdmin({
    page = 1,
    limit = 20,
    status,
  }: {
    page?: number;
    limit?: number;
    status?: EnumProjectInquiryStatus;
  }) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: EnumProjectInquiryStatus) {
    const updated = await this.model.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Inquiry topilmadi');
    return updated;
  }

  private contactLabel(method: EnumContactMethod): string {
    switch (method) {
      case EnumContactMethod.CHAT:
        return 'Chat orqali';
      case EnumContactMethod.EMAIL:
        return 'Email';
      case EnumContactMethod.PHONE:
        return 'Telefon';
      case EnumContactMethod.WHATSAPP:
        return 'WhatsApp';
      case EnumContactMethod.TELEGRAM:
        return 'Telegram';
      default:
        return method;
    }
  }
}
