import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inquiry, InquiryDocument } from './inquiry.schema';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import {
  Property,
  PropertyDocument,
} from '../property/schemas/property.schema';
import { EnumLanguage } from 'src/enums/language.enum';

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

    const inquiry = new this.inquiryModel({
      ...dto,
      seller: property.author,
    });
    return inquiry.save();
  }

  async findAllForSeller({
    userId,
    language,
  }: {
    userId: string;
    language: EnumLanguage;
  }) {
    const inquiries = await this.inquiryModel
      .find({ seller: userId })
      .populate('user', 'first_name last_name email avatar')
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return inquiries;
  }
}
