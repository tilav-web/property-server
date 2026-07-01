import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './admin.schema';
import { AdminController } from './controllers/admin.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminService } from './services/admin.service';
import { User, UserSchema } from '../user/user.schema';
import { AdminUserService } from './services/admin-user.service';
import { AdminUserController } from './controllers/admin-user.controller';
import { FileModule } from '../file/file.module';
import { UserModule } from '../user/user.module';
import { Property, PropertySchema } from '../property/schemas/property.schema';
import { AdminPropertyController } from './controllers/admin-property.controller';
import { AdminPropertyService } from './services/admin-property.service';
import { Advertise, AdvertiseSchema } from '../advertise/advertise.schema';
import { AdminAdvertiseController } from './controllers/admin-advertise.controller';
import { AdminAdvertiseService } from './services/admin-advertise.service';
import { AdminStatisticService } from './services/admin-statistic.service';
import { AdminStatisticController } from './controllers/admin-statistic.controller';
import { AdminTagController } from './controllers/admin-tag.controller';
import { AdminTagService } from './services/admin-tag.service';
import { Tag, TagSchema } from '../tag/schemas/tag.schema';
import { TagModule } from '../tag/tag.module';
import { PremiumModule } from '../premium/premium.module';
import { Inquiry, InquirySchema } from '../inquiry/schemas/inquiry.schema';
import { AdminInquiryService } from './services/admin-inquiry.service';
import { AdminInquiryController } from './controllers/admin-inquiry.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: User.name, schema: UserSchema },
      { name: Property.name, schema: PropertySchema },
      { name: Advertise.name, schema: AdvertiseSchema },
      { name: Tag.name, schema: TagSchema },
      { name: Inquiry.name, schema: InquirySchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    FileModule,
    TagModule,
    PremiumModule,
    UserModule,
  ],
  providers: [
    AdminService,
    AdminJwtStrategy,
    AdminUserService,
    AdminPropertyService,
    AdminAdvertiseService,
    AdminStatisticService,
    AdminTagService,
    AdminInquiryService,
  ],
  controllers: [
    AdminController,
    AdminUserController,
    AdminPropertyController,
    AdminAdvertiseController,
    AdminStatisticController,
    AdminTagController,
    AdminInquiryController,
  ],
  exports: [
    AdminService,
    AdminUserService,
    AdminPropertyService,
    AdminAdvertiseService,
    AdminStatisticService,
  ],
})
export class AdminModule {}
