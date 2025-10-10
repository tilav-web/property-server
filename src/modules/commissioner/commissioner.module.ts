import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Commissioner, CommissionerSchema } from './commissioner.schema';
import { CommissionerController } from './commissioner.controller';
import { CommissionerService } from './commissioner.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commissioner.name, schema: CommissionerSchema },
    ]),
  ],
  controllers: [CommissionerController],
  providers: [CommissionerService],
})
export class CommissionerModule {}
