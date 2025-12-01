import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import {
  MessageStatus,
  MessageStatusSchema,
} from './schemas/message-status.schema';
import { Property, PropertySchema } from '../property/schemas/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: MessageStatus.name, schema: MessageStatusSchema },
      {
        name: Property.name,
        schema: PropertySchema,
      },
    ]),
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
