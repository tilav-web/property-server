import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from 'src/modules/property/schemas/property.schema';
import { User } from 'src/modules/user/user.schema';
import { Advertise } from 'src/modules/advertise/advertise.schema';
import { EnumPropertyStatus } from 'src/modules/property/enums/property-status.enum';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';
import { Project } from 'src/modules/project/project.schema';
import { Developer } from 'src/modules/developer/developer.schema';
import {
  ProjectInquiry,
  EnumProjectInquiryStatus,
} from 'src/modules/project-inquiry/project-inquiry.schema';
import {
  Inquiry,
  EnumInquiryStatus,
} from 'src/modules/inquiry/schemas/inquiry.schema';
import { Transaction } from 'src/modules/payment/schemas/transaction.schema';
import { AdminApprovalStatusEnum } from 'src/enums/admin-approval-status.enum';

interface DailyCount {
  _id: string; // YYYY-MM-DD
  count: number;
}

@Injectable()
export class AdminStatisticService {
  constructor(
    @InjectModel(Property.name) private readonly propertyModel: Model<Property>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Advertise.name)
    private readonly advertiseModel: Model<Advertise>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Developer.name)
    private readonly developerModel: Model<Developer>,
    @InjectModel(ProjectInquiry.name)
    private readonly projectInquiryModel: Model<ProjectInquiry>,
    @InjectModel(Inquiry.name) private readonly inquiryModel: Model<Inquiry>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  /** Oxirgi `days` kun uchun kunlik createdAt agregatsiyasi */
  private dailySeries(model: Model<unknown>, since: Date) {
    return model.aggregate<DailyCount>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getDashboardStatistics() {
    const DAYS = 30;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (DAYS - 1));

    const [
      totalProperties,
      approvedProperties,
      pendingProperties,
      rejectedProperties,
      totalUsers,
      verifiedUsers,
      totalAdvertises,
      approvedAdvertises,
      pendingAdvertises,
      paidAdvertises,
      totalProjects,
      totalDevelopers,
      newProjectInquiries,
      pendingPropertyInquiries,
      awaitingPayments,
      userSeries,
      propertySeries,
      propertiesByCategory,
      propertiesByStatus,
    ] = await Promise.all([
      this.propertyModel.countDocuments().exec(),
      this.propertyModel
        .countDocuments({ status: EnumPropertyStatus.APPROVED })
        .exec(),
      this.propertyModel
        .countDocuments({ status: EnumPropertyStatus.PENDING })
        .exec(),
      this.propertyModel
        .countDocuments({ status: EnumPropertyStatus.REJECTED })
        .exec(),
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ 'phone.isVerified': true }).exec(),
      this.advertiseModel.countDocuments().exec(),
      this.advertiseModel
        .countDocuments({ status: EnumAdvertiseStatus.APPROVED })
        .exec(),
      this.advertiseModel
        .countDocuments({ status: EnumAdvertiseStatus.PENDING })
        .exec(),
      this.advertiseModel
        .countDocuments({ payment_status: EnumPaymentStatus.PAID })
        .exec(),
      this.projectModel.countDocuments().exec(),
      this.developerModel.countDocuments({ is_active: true }).exec(),
      this.projectInquiryModel
        .countDocuments({ status: EnumProjectInquiryStatus.NEW })
        .exec(),
      this.inquiryModel
        .countDocuments({ status: EnumInquiryStatus.PENDING })
        .exec(),
      this.transactionModel
        .countDocuments({ admin_approval: AdminApprovalStatusEnum.AWAITING })
        .exec(),
      this.dailySeries(this.userModel as Model<unknown>, since),
      this.dailySeries(this.propertyModel as Model<unknown>, since),
      this.propertyModel
        .aggregate<{
          _id: string;
          count: number;
        }>([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .exec(),
      this.propertyModel
        .aggregate<{
          _id: string;
          count: number;
        }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        .exec(),
    ]);

    // Bo'sh kunlarni 0 bilan to'ldirilgan uzluksiz 30 kunlik seriya
    const userByDay = new Map(userSeries.map((d) => [d._id, d.count]));
    const propertyByDay = new Map(propertySeries.map((d) => [d._id, d.count]));
    const series: Array<{ date: string; users: number; properties: number }> =
      [];
    for (let i = 0; i < DAYS; i++) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      series.push({
        date: key,
        users: userByDay.get(key) ?? 0,
        properties: propertyByDay.get(key) ?? 0,
      });
    }

    return {
      // Legacy hisoblagichlar (eski client bilan moslik uchun saqlangan)
      totalProperties,
      approvedProperties,
      totalUsers,
      verifiedUsers,
      totalAdvertises,
      approvedAdvertises,
      pendingAdvertises,
      paidAdvertises,
      // Yangi hisoblagichlar
      pendingProperties,
      rejectedProperties,
      totalProjects,
      totalDevelopers,
      newProjectInquiries,
      pendingPropertyInquiries,
      awaitingPayments,
      // Grafiklar
      series,
      propertiesByCategory: propertiesByCategory.map((c) => ({
        category: c._id,
        count: c.count,
      })),
      propertiesByStatus: propertiesByStatus.map((s) => ({
        status: s._id,
        count: s.count,
      })),
    };
  }
}
