import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import {
  PropertyView,
  PropertyViewDocument,
} from './schemas/property-view.schema';
import {
  Property,
  PropertyDocument,
} from '../property/schemas/property.schema';

export interface PropertyViewedEvent {
  propertyId: string;
  userId?: string;
  ip?: string;
}

@Injectable()
export class PropertyViewService {
  constructor(
    @InjectModel(PropertyView.name)
    private readonly viewModel: Model<PropertyViewDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  @OnEvent('property.viewed', { async: true })
  async handlePropertyViewed(event: PropertyViewedEvent): Promise<void> {
    const { propertyId, userId, ip } = event;

    const viewerId =
      userId ??
      createHash('sha256')
        .update(ip ?? 'anonymous')
        .digest('hex');

    try {
      const result = await this.viewModel.updateOne(
        { propertyId: new Types.ObjectId(propertyId), viewerId },
        { $setOnInsert: { viewedAt: new Date() } },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        await this.propertyModel.updateOne(
          { _id: new Types.ObjectId(propertyId) },
          { $inc: { viewCount: 1 } },
        );
      }
    } catch {
      // View tracking xatosi asosiy funksionalikni bloklamasin
    }
  }
}
