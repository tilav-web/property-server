import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './property.schema';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { FileModule } from '../file/file.module';
import { Like, LikeSchema } from '../interactions/schemas/like.schema';
import { Save, SaveSchema } from '../interactions/schemas/save.schema';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Like.name, schema: LikeSchema },
      { name: Save.name, schema: SaveSchema },
    ]),
    FileModule,
    MessageModule,
  ],
  providers: [PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService],
})
export class PropertyModule {}
