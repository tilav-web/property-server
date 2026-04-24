import {
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OpenaiService } from '../openai/openai.service';
import { ChatService } from '../chat/chat.service';
import { MessageType } from '../chat/enums/message-type.enum';
import {
  ChatMessage,
  ChatMessageDocument,
} from '../chat/schemas/chat-message.schema';
import { UserService } from '../user/user.service';

const AI_SYSTEM_PROMPT = `Sen Amaar Properties platformasining AI yordamchisisan.
Platforma Malayziya ko'chmas mulk bozori uchun ishlaydi (sotib olish, ijara, ipoteka).

Vazifalar:
- Foydalanuvchiga mulk qidirishga yordam berish (joylashuv, narx, xonalar soni, turi)
- Tushunarli va qisqa javob berish
- Agar foydalanuvchi aniq qidiruv bersa, u /search sahifasida qidirib ko'rishi mumkinligini eslatish
- Sotuvchilar bilan bog'lanish uchun "Sotuvchiga yozish" tugmasidan foydalanishni maslahat berish
- Inquiry (so'rov) yuborganda seller chatda javob berishi haqida eslatish

Muhim:
- Foydalanuvchi qaysi tilda yozsa, shu tilda javob ber (uz/ru/en/ms)
- Taqdim etilgan ma'lumotlardan tashqari narsa bilmasligingni aniq ayt
- Qisqa bo'l (3-5 gap) agar foydalanuvchi batafsil so'ramasa
- Shaxsiy ma'lumot so'rama`;

const HISTORY_LIMIT = 20;

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    private readonly openai: OpenaiService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  /**
   * Foydalanuvchi AI conversation'ga xabar yuborganda chaqiriladi (fire-and-forget).
   * Context tuzadi, OpenAI'ga yuboradi, javobni chatga qaytaradi.
   */
  async generateReply(conversationId: string): Promise<void> {
    try {
      const aiUserId = await this.userService.getAiAgentId();

      // Oxirgi HISTORY_LIMIT xabarni olamiz (chronological tartibda)
      const recent = await this.messageModel
        .find({
          conversation: new Types.ObjectId(conversationId),
          type: { $in: [MessageType.TEXT, MessageType.SYSTEM] },
        })
        .sort({ _id: -1 })
        .limit(HISTORY_LIMIT)
        .lean()
        .exec();

      const ordered = recent.reverse();

      const history: OpenAIMessage[] = ordered.map((m) => ({
        role: String(m.sender) === aiUserId ? 'assistant' : 'user',
        content: m.body,
      }));

      const reply = await this.openai.generateText(
        this.buildPromptFromHistory(history),
      );

      await this.chatService.createSystemMessage({
        conversationId,
        senderId: aiUserId,
        type: MessageType.TEXT,
        body: reply,
      });
    } catch (err) {
      this.logger.warn(`AI reply failed: ${String(err)}`);
      try {
        const aiUserId = await this.userService.getAiAgentId();
        await this.chatService.createSystemMessage({
          conversationId,
          senderId: aiUserId,
          type: MessageType.TEXT,
          body: 'Kechirasiz, hozir javob bera olmayapman. Birozdan so‘ng urinib ko‘ring.',
        });
      } catch {
        // swallow
      }
    }
  }

  async sendWelcome(conversationId: string): Promise<void> {
    try {
      const aiUserId = await this.userService.getAiAgentId();
      await this.chatService.createSystemMessage({
        conversationId,
        senderId: aiUserId,
        type: MessageType.TEXT,
        body:
          'Salom! Men Amaar Properties AI yordamchisiman. Mulk qidirish, narx-navo yoki platforma haqida savollaringiz bo‘lsa, so‘rang.',
      });
    } catch (err) {
      this.logger.warn(`AI welcome failed: ${String(err)}`);
    }
  }

  private buildPromptFromHistory(history: OpenAIMessage[]): string {
    // OpenaiService.generateText() oddiy prompt qabul qiladi. System + history'ni
    // bitta prompt ichiga birlashtiramiz.
    const lines: string[] = [AI_SYSTEM_PROMPT, ''];
    for (const m of history) {
      const prefix = m.role === 'user' ? 'Foydalanuvchi:' : 'Yordamchi:';
      lines.push(`${prefix} ${m.content}`);
    }
    lines.push('Yordamchi:');
    return lines.join('\n');
  }
}
