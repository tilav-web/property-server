import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProjectInquiry,
  ProjectInquirySchema,
} from './project-inquiry.schema';
import { ProjectInquiryService } from './project-inquiry.service';
import { ProjectInquiryController } from './project-inquiry.controller';
import { ProjectModule } from '../project/project.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../mailer/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectInquiry.name, schema: ProjectInquirySchema },
    ]),
    ProjectModule,
    forwardRef(() => AdminModule),
    NotificationModule,
    MailModule,
  ],
  controllers: [ProjectInquiryController],
  providers: [ProjectInquiryService],
})
export class ProjectInquiryModule {}
