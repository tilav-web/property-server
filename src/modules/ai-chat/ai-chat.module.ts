import {
  Logger,
  Module,
  OnApplicationBootstrap,
  forwardRef,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiChatService } from './ai-chat.service';
import { AiChatController } from './ai-chat.controller';
import {
  ChatMessage,
  ChatMessageSchema,
} from '../chat/schemas/chat-message.schema';
import { GenaiModule } from '../openai/openai.module';
import { UserModule } from '../user/user.module';
import { ChatModule } from '../chat/chat.module';
import { UserService } from '../user/user.service';
import { AiPropertyModule } from '../ai-property/ai-property.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    GenaiModule,
    UserModule,
    AiPropertyModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [AiChatController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiChatModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiChatModule.name);

  constructor(private readonly userService: UserService) {}

  async onApplicationBootstrap() {
    try {
      const ai = await this.userService.ensureAiAgent();
      this.logger.log(`AI agent ready: ${String(ai._id)}`);
    } catch (err) {
      this.logger.error(`AI agent seed failed: ${String(err)}`);
    }
  }
}
