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
import { AiPropertyService } from '../ai-property/ai-property.service';
import { EnumLanguage } from 'src/enums/language.enum';

const AI_SYSTEM_PROMPT = `Sen Amaar Properties platformasining AI yordamchisisan.
Platforma Malayziya ko'chmas mulk bozori uchun ishlaydi (sotib olish, ijara, ipoteka).

Vazifang:
- Foydalanuvchi yozgan xabarni tahlil qilish
- Agar foydalanuvchi mulk qidirayotgan bo'lsa (shahar, xonalar, narx, kategoriya va h.k. bo'yicha) — searchQuery'ni aniqlab qaytar
- Har doim qisqa va foydali reply (3-5 gap) qaytar

MUHIM qoidalar:
- reply foydalanuvchi tilida bo'lsin (uz/ru/en/ms — yozuvidan aniqla)
- Agar qidiruv bo'lsa: "Mana men siz uchun topgan variantlar:" kabi tez kirish gapi bilan reply ber
- Agar savol bo'lsa (umumiy): to'g'ridan-to'g'ri javob ber, searchQuery bo'sh bo'lsin
- Shaxsiy ma'lumot so'rama
- isSearch=true bo'lishi uchun foydalanuvchi aniq mulk izlayotgan bo'lishi kerak ("KLda 2 xonali", "Selangorda ijara", "5 lakhgacha kvartira", "pool bilan")
- Salomlashish, umumiy savollar, ma'lumot so'rash uchun isSearch=false`;

const RESPONSE_SCHEMA_PROMPT = `Natija STRICTLY quyidagi JSON shaklida bo'lsin:
{
  "reply": "foydalanuvchiga qisqa javob",
  "isSearch": true yoki false,
  "searchQuery": "agar isSearch=true bo'lsa, mulk qidiruv so'rovi (foydalanuvchi tilida)" yoki ""
}`;

const HISTORY_LIMIT = 12;
const SEARCH_RESULT_LIMIT = 5;

interface ClassifiedReply {
  reply: string;
  isSearch: boolean;
  searchQuery: string;
}

interface CompactProperty {
  _id: string;
  title: string;
  address?: string;
  category?: string;
  price?: number;
  currency?: string;
  photo?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

type MessageRecord = {
  role: 'user' | 'assistant';
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
    private readonly aiPropertyService: AiPropertyService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async generateReply(conversationId: string): Promise<void> {
    try {
      const aiUserId = await this.userService.getAiAgentId();

      const recent = await this.messageModel
        .find({
          conversation: new Types.ObjectId(conversationId),
          type: { $in: [MessageType.TEXT, MessageType.SYSTEM] },
        })
        .sort({ _id: -1 })
        .limit(HISTORY_LIMIT)
        .lean()
        .exec();

      const history: MessageRecord[] = recent
        .slice()
        .reverse()
        .map((m) => ({
          role: String(m.sender) === aiUserId ? 'assistant' : 'user',
          content: m.body,
        }));

      const classified = await this.classify(history);

      let properties: CompactProperty[] = [];
      if (classified.isSearch && classified.searchQuery.trim()) {
        properties = await this.searchProperties(classified.searchQuery);
      }

      const metadata: Record<string, unknown> = {};
      if (properties.length > 0) {
        metadata.properties = properties;
        metadata.searchQuery = classified.searchQuery;
      } else if (classified.isSearch && classified.searchQuery.trim()) {
        metadata.searchQuery = classified.searchQuery;
        metadata.noResults = true;
      }

      let finalBody = classified.reply;
      if (classified.isSearch && properties.length === 0) {
        // Hech narsa topilmadi — AI'ning "mana topildi" gapini almashtirib, aniq
        // xabar qaytaramiz (hozircha Malayziya bozori ekanligini eslatib).
        finalBody = `Kechirasiz, "${classified.searchQuery}" bo'yicha mos e'lon topilmadi. Hozircha platformada asosan Malayziya ko'chmas mulki mavjud. Boshqa shahar, narx oralig'i yoki kengroq shartlar bilan urinib ko'ring.`;
      }

      await this.chatService.createSystemMessage({
        conversationId,
        senderId: aiUserId,
        type: MessageType.TEXT,
        body: finalBody,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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
          "Salom! Men Amaar Properties AI yordamchisiman 🤖\n\nHozircha asosan Malayziya ko'chmas mulki bo'yicha yordam beraman.\n\nMulk qidirish uchun oddiy tilda yozing:\n• \"KLda 3 xonali kvartira\"\n• \"Selangorda ijara 2000 dan arzon\"\n• \"pool bilan yangi kvartira\"\n\nYoki platforma haqida savol bering.",
      });
    } catch (err) {
      this.logger.warn(`AI welcome failed: ${String(err)}`);
    }
  }

  private async classify(
    history: MessageRecord[],
  ): Promise<ClassifiedReply> {
    const conversationText = history
      .map((m) => {
        const prefix = m.role === 'user' ? 'User' : 'Assistant';
        return `${prefix}: ${m.content}`;
      })
      .join('\n');

    const system = `${AI_SYSTEM_PROMPT}\n\n${RESPONSE_SCHEMA_PROMPT}`;
    const user = `Suhbat:\n${conversationText}\n\nOxirgi User xabariga javob bering.`;

    try {
      const { data } = await this.openai.generateJson<Partial<ClassifiedReply>>({
        system,
        user,
        model: 'gpt-4o-mini',
        temperature: 0.4,
        maxTokens: 600,
      });

      return {
        reply:
          typeof data?.reply === 'string' && data.reply.trim()
            ? data.reply.trim()
            : 'Uzr, sizni to‘liq tushunmadim. Qayta yozib ko‘ring.',
        isSearch: Boolean(data?.isSearch),
        searchQuery:
          typeof data?.searchQuery === 'string' ? data.searchQuery : '',
      };
    } catch (err) {
      this.logger.warn(`AI classify failed: ${String(err)}`);
      return {
        reply: 'Kechirasiz, savolingizni qayta yuboring.',
        isSearch: false,
        searchQuery: '',
      };
    }
  }

  private async searchProperties(
    query: string,
  ): Promise<CompactProperty[]> {
    try {
      const res = await this.aiPropertyService.findByPrompt({
        userPrompt: query,
        page: 1,
        limit: SEARCH_RESULT_LIMIT,
        language: EnumLanguage.EN,
      });
      return res.properties.map((p) =>
        this.toCompact(p as unknown as Record<string, unknown>),
      );
    } catch (err) {
      this.logger.warn(`AI property search failed: ${String(err)}`);
      return [];
    }
  }

  private toCompact(p: Record<string, unknown>): CompactProperty {
    const photos = Array.isArray(p.photos) ? (p.photos as string[]) : [];
    return {
      _id: String(p._id),
      title:
        typeof p.title === 'string'
          ? p.title
          : (((p.title as Record<string, string>) ?? {}).en ?? 'Property'),
      address:
        typeof p.address === 'string'
          ? p.address
          : ((p.address as Record<string, string>) ?? {}).en,
      category:
        typeof p.category === 'string' ? (p.category as string) : undefined,
      price: typeof p.price === 'number' ? (p.price as number) : undefined,
      currency:
        typeof p.currency === 'string' ? (p.currency as string) : undefined,
      photo: photos[0],
      bedrooms:
        typeof p.bedrooms === 'number' ? (p.bedrooms as number) : undefined,
      bathrooms:
        typeof p.bathrooms === 'number' ? (p.bathrooms as number) : undefined,
      area: typeof p.area === 'number' ? (p.area as number) : undefined,
    };
  }
}
