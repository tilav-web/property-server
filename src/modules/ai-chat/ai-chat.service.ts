import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
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
import { CountryConfigService } from 'src/common/config/country.config';

// Country-aware AI prompt - mamlakat va valyuta CountryConfigService'dan
function buildAiSystemPrompt(country: 'UZ' | 'MY', currency: string): string {
  const market = country === 'UZ' ? "O'zbekiston" : 'Malaysia';
  const exampleCity = country === 'UZ' ? 'Toshkentda' : 'KLda';
  const exampleArea = country === 'UZ' ? 'Samarqandda' : 'Selangorda';
  const examplePrice =
    country === 'UZ' ? '500 mln so\'mgacha' : '5 lakhgacha';

  return `Sen Amaar Properties platformasining AI yordamchisisan.
Platforma ${market} ko'chmas mulk bozori uchun ishlaydi (sotib olish, ijara, ipoteka).
Asosiy valyuta: ${currency}.

Vazifang:
- Foydalanuvchi yozgan xabarni tahlil qilish
- Agar foydalanuvchi mulk qidirayotgan bo'lsa (shahar, xonalar, narx, kategoriya va h.k. bo'yicha) — searchQuery'ni aniqlab qaytar
- Har doim qisqa va foydali reply (3-5 gap) qaytar

MUHIM qoidalar:
- reply foydalanuvchi tilida bo'lsin (uz/ru/en/ms — yozuvidan aniqla)
- Agar qidiruv bo'lsa: "Mana men siz uchun topgan variantlar:" kabi tez kirish gapi bilan reply ber
- Agar savol bo'lsa (umumiy): to'g'ridan-to'g'ri javob ber, searchQuery bo'sh bo'lsin
- Shaxsiy ma'lumot so'rama
- isSearch=true bo'lishi uchun foydalanuvchi aniq mulk izlayotgan bo'lishi kerak ("${exampleCity} 2 xonali", "${exampleArea} ijara", "${examplePrice} kvartira", "pool bilan")
- Salomlashish, umumiy savollar, ma'lumot so'rash uchun isSearch=false`;
}

const RESPONSE_SCHEMA_PROMPT = `Natija STRICTLY quyidagi JSON shaklida bo'lsin:
{
  "reply": "foydalanuvchiga qisqa javob",
  "isSearch": true yoki false,
  "searchQuery": "agar isSearch=true bo'lsa, mulk qidiruv so'rovi (foydalanuvchi tilida)" yoki ""
}`;

const HISTORY_LIMIT = 12;
const SEARCH_RESULT_LIMIT = 5;
const VOICE_TTS_VOICE = 'nova';
const VOICE_TTS_FORMAT = 'mp3';
const VOICE_INTRO_MAX_CHARS = 200;

interface ClassifiedReply {
  reply: string;
  isSearch: boolean;
  searchQuery: string;
}

export interface CompactProperty {
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
    private readonly countryConfig: CountryConfigService,
  ) {}

  /** Mamlakat nomi - foydalanuvchiga ko'rsatadigan matn uchun. */
  private get marketName(): string {
    return this.countryConfig.country === 'UZ' ? "O'zbekiston" : 'Malaysia';
  }

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
        finalBody = `Kechirasiz, "${classified.searchQuery}" bo'yicha mos e'lon topilmadi. Hozircha platformada asosan ${this.marketName} ko'chmas mulki mavjud. Boshqa shahar, narx oralig'i yoki kengroq shartlar bilan urinib ko'ring.`;
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

  /**
   * Anonim foydalanuvchi uchun (login bo'lmagan) — DB'ga hech narsa
   * yozmaydi, faqat AI javobini va topilgan property'larni qaytaradi.
   * History client tarafda saqlanadi va har so'rov bilan yuboriladi.
   */
  async generateAnonymousReply(history: MessageRecord[]): Promise<{
    body: string;
    properties?: CompactProperty[];
    searchQuery?: string;
    noResults?: boolean;
  }> {
    const safeHistory = history
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-HISTORY_LIMIT);

    if (safeHistory.length === 0) {
      return {
        body: 'Salom! Sizga qanday yordam bera olaman?',
      };
    }

    const classified = await this.classify(safeHistory);

    let properties: CompactProperty[] = [];
    if (classified.isSearch && classified.searchQuery.trim()) {
      properties = await this.searchProperties(classified.searchQuery);
    }

    let body = classified.reply;
    let noResults = false;
    if (classified.isSearch && properties.length === 0) {
      body = `Kechirasiz, "${classified.searchQuery}" bo'yicha mos e'lon topilmadi. Hozircha platformada asosan ${this.marketName} ko'chmas mulki mavjud. Boshqa shahar, narx oralig'i yoki kengroq shartlar bilan urinib ko'ring.`;
      noResults = true;
    }

    return {
      body,
      properties: properties.length > 0 ? properties : undefined,
      searchQuery: classified.isSearch ? classified.searchQuery : undefined,
      noResults: noResults || undefined,
    };
  }

  /**
   * Voice -> text (Whisper) -> classify -> property search.
   * Authenticated va anonymous flow uchun umumiy logika.
   * Voice'da AI faqat intro matnni "o'qib beradi" (TTS); property kartalarini
   * ovozda emas, UI'da ko'rsatadi.
   */
  async processVoice(opts: {
    audio: Buffer;
    mimeType?: string;
    filename?: string;
    language?: string;
    history?: MessageRecord[];
  }): Promise<{
    transcript: string;
    body: string;
    intro: string;
    properties?: CompactProperty[];
    searchQuery?: string;
    noResults?: boolean;
    audioBase64?: string;
    audioMimeType?: string;
  }> {
    const transcript = await this.openai.transcribeAudio({
      buffer: opts.audio,
      filename: opts.filename ?? 'voice.webm',
      mimeType: opts.mimeType,
      language: opts.language,
    });

    const history: MessageRecord[] = [
      ...(opts.history ?? []),
      { role: 'user' as const, content: transcript },
    ].slice(-HISTORY_LIMIT);

    const classified = await this.classify(history);

    let properties: CompactProperty[] = [];
    if (classified.isSearch && classified.searchQuery.trim()) {
      properties = await this.searchProperties(classified.searchQuery);
    }

    let body = classified.reply;
    let noResults = false;
    if (classified.isSearch && properties.length === 0) {
      body = `Kechirasiz, "${classified.searchQuery}" bo'yicha mos e'lon topilmadi. Hozircha platformada asosan ${this.marketName} ko'chmas mulki mavjud. Boshqa shahar, narx oralig'i yoki kengroq shartlar bilan urinib ko'ring.`;
      noResults = true;
    }

    // Voice qaytarish: agar property topilgan bo'lsa - faqat intro matn
    // (birinchi gap yoki qisqartirilgan body), aks holda - to'liq body.
    const intro =
      properties.length > 0
        ? this.extractIntroSentence(body)
        : body.slice(0, 800);

    let audioBase64: string | undefined;
    let audioMimeType: string | undefined;
    try {
      const audio = await this.openai.generateSpeech({
        text: intro,
        voice: VOICE_TTS_VOICE,
        format: VOICE_TTS_FORMAT,
      });
      audioBase64 = audio.toString('base64');
      audioMimeType = 'audio/mpeg';
    } catch (err) {
      this.logger.warn(`TTS failed: ${String(err)}`);
    }

    return {
      transcript,
      body,
      intro,
      properties: properties.length > 0 ? properties : undefined,
      searchQuery: classified.isSearch ? classified.searchQuery : undefined,
      noResults: noResults || undefined,
      audioBase64,
      audioMimeType,
    };
  }

  /**
   * Authenticated voice flow: foydalanuvchi voice yuboradi, transcript bilan
   * user xabari saqlanadi, keyin AI javobi (text + audio metadata) saqlanadi.
   */
  async processAuthenticatedVoice(opts: {
    conversationId: string;
    senderId: string;
    audio: Buffer;
    mimeType?: string;
    filename?: string;
    language?: string;
  }): Promise<{
    transcript: string;
    aiBody: string;
    properties?: CompactProperty[];
    audioBase64?: string;
    audioMimeType?: string;
  }> {
    const aiUserId = await this.userService.getAiAgentId();

    const recent = await this.messageModel
      .find({
        conversation: new Types.ObjectId(opts.conversationId),
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

    const result = await this.processVoice({
      audio: opts.audio,
      mimeType: opts.mimeType,
      filename: opts.filename,
      language: opts.language,
      history,
    });

    // 1) Foydalanuvchi xabari (transcript bilan)
    await this.chatService.createSystemMessage({
      conversationId: opts.conversationId,
      senderId: opts.senderId,
      type: MessageType.TEXT,
      body: result.transcript,
      metadata: { voice: true },
    });

    // 2) AI javobi
    const aiMetadata: Record<string, unknown> = { voice: true };
    if (result.properties && result.properties.length > 0) {
      aiMetadata.properties = result.properties;
      aiMetadata.searchQuery = result.searchQuery;
    } else if (result.searchQuery) {
      aiMetadata.searchQuery = result.searchQuery;
      aiMetadata.noResults = true;
    }
    if (result.audioBase64) {
      aiMetadata.audio = {
        base64: result.audioBase64,
        mimeType: result.audioMimeType,
      };
    }

    await this.chatService.createSystemMessage({
      conversationId: opts.conversationId,
      senderId: aiUserId,
      type: MessageType.TEXT,
      body: result.body,
      metadata: aiMetadata,
    });

    return {
      transcript: result.transcript,
      aiBody: result.body,
      properties: result.properties,
      audioBase64: result.audioBase64,
      audioMimeType: result.audioMimeType,
    };
  }

  /** Body matnidan TTS uchun intro qism (birinchi gap yoki ~200 belgi) */
  private extractIntroSentence(body: string): string {
    const trimmed = body.trim();
    if (trimmed.length <= VOICE_INTRO_MAX_CHARS) return trimmed;
    const match = trimmed.match(/^[\s\S]*?[.!?:]/);
    if (match && match[0].length <= VOICE_INTRO_MAX_CHARS) {
      return match[0].trim();
    }
    return trimmed.slice(0, VOICE_INTRO_MAX_CHARS).trim();
  }

  async sendWelcome(conversationId: string): Promise<void> {
    try {
      const aiUserId = await this.userService.getAiAgentId();
      const examples =
        this.countryConfig.country === 'UZ'
          ? '• "Toshkentda 3 xonali kvartira"\n• "Samarqandda ijara 5 mln gacha"\n• "yangi binoda kvartira"'
          : '• "KLda 3 xonali kvartira"\n• "Selangorda ijara 2000 dan arzon"\n• "pool bilan yangi kvartira"';
      await this.chatService.createSystemMessage({
        conversationId,
        senderId: aiUserId,
        type: MessageType.TEXT,
        body: `Salom! Men Amaar Properties AI yordamchisiman 🤖\n\nHozircha asosan ${this.marketName} ko'chmas mulki bo'yicha yordam beraman.\n\nMulk qidirish uchun oddiy tilda yozing:\n${examples}\n\nYoki platforma haqida savol bering.`,
      });
    } catch (err) {
      this.logger.warn(`AI welcome failed: ${String(err)}`);
    }
  }

  private async classify(history: MessageRecord[]): Promise<ClassifiedReply> {
    const conversationText = history
      .map((m) => {
        const prefix = m.role === 'user' ? 'User' : 'Assistant';
        return `${prefix}: ${m.content}`;
      })
      .join('\n');

    const systemPrompt = buildAiSystemPrompt(
      this.countryConfig.country,
      this.countryConfig.defaultCurrency,
    );
    const system = `${systemPrompt}\n\n${RESPONSE_SCHEMA_PROMPT}`;
    const user = `Suhbat:\n${conversationText}\n\nOxirgi User xabariga javob bering.`;

    try {
      const { data } = await this.openai.generateJson<Partial<ClassifiedReply>>(
        {
          system,
          user,
          model: 'gpt-4o-mini',
          temperature: 0.4,
          maxTokens: 600,
        },
      );

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

  private async searchProperties(query: string): Promise<CompactProperty[]> {
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
      category: typeof p.category === 'string' ? p.category : undefined,
      price: typeof p.price === 'number' ? p.price : undefined,
      currency: typeof p.currency === 'string' ? p.currency : undefined,
      photo: photos[0],
      bedrooms: typeof p.bedrooms === 'number' ? p.bedrooms : undefined,
      bathrooms: typeof p.bathrooms === 'number' ? p.bathrooms : undefined,
      area: typeof p.area === 'number' ? p.area : undefined,
    };
  }
}
