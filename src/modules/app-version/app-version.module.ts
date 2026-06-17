import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppVersion, AppVersionSchema } from './app-version.schema';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';
import { AdminAppVersionController } from './admin-app-version.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppVersion.name, schema: AppVersionSchema },
    ]),
  ],
  controllers: [AppVersionController, AdminAppVersionController],
  providers: [AppVersionService],
})
export class AppVersionModule {}
