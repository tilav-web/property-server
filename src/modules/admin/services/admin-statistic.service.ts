import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from 'src/modules/property/schemas/property.schema';
import { User } from 'src/modules/user/user.schema';
import { Seller } from 'src/modules/seller/schemas/seller.schema';
import { Advertise } from 'src/modules/advertise/advertise.schema';
import { EnumPropertyStatus } from 'src/modules/property/enums/property-status.enum';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';

@Injectable()
export class AdminStatisticService {
  constructor(
    @InjectModel(Property.name) private readonly propertyModel: Model<Property>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Seller.name) private readonly sellerModel: Model<Seller>,
    @InjectModel(Advertise.name)
    private readonly advertiseModel: Model<Advertise>,
  ) {}

  async getDashboardStatistics() {
    const totalProperties = await this.propertyModel.countDocuments().exec();
    const approvedProperties = await this.propertyModel
      .countDocuments({ status: EnumPropertyStatus.APPROVED })
      .exec();

    const totalUsers = await this.userModel.countDocuments().exec();
    const totalSellers = await this.sellerModel.countDocuments().exec();

    const totalAdvertises = await this.advertiseModel.countDocuments().exec();
    const approvedAdvertises = await this.advertiseModel
      .countDocuments({ status: EnumAdvertiseStatus.APPROVED })
      .exec();
    const pendingAdvertises = await this.advertiseModel
      .countDocuments({ status: EnumAdvertiseStatus.PENDING })
      .exec();
    const paidAdvertises = await this.advertiseModel
      .countDocuments({ payment_status: EnumPaymentStatus.PAID })
      .exec();

    return {
      totalProperties,
      approvedProperties,
      totalUsers,
      totalSellers,
      totalAdvertises,
      approvedAdvertises,
      pendingAdvertises,
      paidAdvertises,
    };
  }
}
