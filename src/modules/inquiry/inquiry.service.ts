import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inquiry, InquiryDocument } from './inquiry.schema';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { Property, PropertyDocument } from '../property/property.schema';

@Injectable()
export class InquiryService {
  constructor(
    @InjectModel(Inquiry.name) private inquiryModel: Model<InquiryDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
  ) {}

  async create(dto: CreateInquiryDto & { user: string }): Promise<Inquiry> {
    // Check if property exists
    const property = await this.propertyModel.findById(dto.property);
    if (!property) {
      throw new NotFoundException('Mulk topilmadi');
    }

    // Check if the user is the owner of the property
    if (property.author.toString() === dto.user.toString()) {
      throw new ForbiddenException(
        "Siz o'zingizning mulkingizga so'rov yubora olmaysiz",
      );
    }

    const inquiry = new this.inquiryModel(dto);
    return inquiry.save();
  }

  async findAllForSeller(userId: string) {
    // Find all properties belonging to the seller
    const sellerProperties = await this.propertyModel
      .find({ author: userId })
      .select('_id');
    const propertyIds = sellerProperties.map((p) => p._id?.toString());
    const query = { property: { $in: propertyIds } };
    const inquiries = await this.inquiryModel
      .find(query)
      .populate('user', 'first_name last_name email avatar')
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .exec();

    return inquiries;
  }
}
