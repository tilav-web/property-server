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
import { Property, PropertySchema } from '../property/schemas/property.schema';
import { AdminPropertyController } from './controllers/admin-property.controller';
import { AdminPropertyService } from './services/admin-property.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: User.name, schema: UserSchema },
      {
        name: Property.name,
        schema: PropertySchema,
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '15m' }, // Access token expiration
      }),
    }),
    FileModule,
  ],
  providers: [
    AdminService,
    AdminJwtStrategy,
    AdminUserService,
    AdminPropertyService,
  ],
  controllers: [AdminController, AdminUserController, AdminPropertyController],
  exports: [AdminService, AdminUserService, AdminPropertyService],
})
export class AdminModule {}
