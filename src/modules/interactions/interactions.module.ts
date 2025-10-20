import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Like, LikeSchema } from './schemas/like.schema';
import { Save, SaveSchema } from './schemas/save.schema';
import { Property, PropertySchema } from '../property/property.schema';
import { LikeService } from './services/like.service';
import { SaveService } from './services/save.service';
import { SaveController } from './controllers/save.controller';
import { LikeController } from './controllers/like.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Like.name, schema: LikeSchema },
      { name: Save.name, schema: SaveSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  providers: [LikeService, SaveService],
  controllers: [LikeController, SaveController],
})
export class InteractionsModule {}
