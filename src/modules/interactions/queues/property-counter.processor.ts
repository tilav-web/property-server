import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import {
  Property,
  PropertyDocument,
} from 'src/modules/property/schemas/property.schema';
import {
  PROPERTY_COUNTER_QUEUE,
  PropertyCounterJob,
} from './property-counter.queue';

/**
 * Like/save bosilganda hosil bo'ladigan Property.liked/saved counter
 * o'zgarishlarini navbatdan olib bazaga yozadi — so'rov-javob yo'lidan
 * chetga chiqarilgan, foydalanuvchi kutib turmaydi.
 */
@Processor(PROPERTY_COUNTER_QUEUE)
export class PropertyCounterProcessor extends WorkerHost {
  private readonly logger = new Logger(PropertyCounterProcessor.name);

  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {
    super();
  }

  async process(job: Job<PropertyCounterJob>): Promise<void> {
    const { propertyId, field, delta } = job.data;
    await this.propertyModel.updateOne(
      { _id: propertyId },
      { $inc: { [field]: delta } },
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PropertyCounterJob>, err: Error): void {
    this.logger.warn(
      `Counter job failed (property=${job?.data?.propertyId}, field=${job?.data?.field}): ${err.message}`,
    );
  }
}
