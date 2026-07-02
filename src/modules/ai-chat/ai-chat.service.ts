import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
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
import { CountryConfigService } from 'src/common/config/country.config';

// Country-aware AI prompt - mamlakat va valyuta CountryConfigService'dan
function buildAiSystemPrompt(
  country: 'UZ' | 'MY',
  currency: string,
  brand: string,
): string {
  const market = country === 'UZ' ? "O'zbekiston" : 'Malaysia';
  const exampleCity = country === 'UZ' ? 'Toshkentda' : 'KLda';
  const exampleArea = country === 'UZ' ? 'Samarqandda' : 'Selangorda';
  const examplePrice =
    country === 'UZ' ? '500 mln so\'mgacha' : '5 lakhgacha';

  return `Sen ${brand} platformasining AI yordamchisisan.
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
  "reply": "foydalanuvchiga qisqa javob (faqat qidiruv BO'LMAGAN holda: savol javobi yoki salomlashish)",
  "isSearch": true yoki false,
  "searchQuery": "agar isSearch=true bo'lsa, mulk qidiruv so'rovi (qisqa, aniq: 'Toshkent 2 xonali ijara')" yoki "",
  "correctedQuery": "agar isSearch=true bo'lsa, user so'rovini to'liq tushunilgan ko'rinishi (masalan: 'Qarshi shahridan uch xonali kvartira kerak')" yoki ""
}`;

// Voice transkripsiya xatolarini tuzatish uchun system prompt qo'shimchasi
const VOICE_CORRECTION_SYSTEM = `
VOICE TRANSKRIPSIYA TUZATISH:
User xabari ovozdan transkript qilingan — nutq tanish xatolari bo'lishi mumkin.
USER NIMA DEMOQCHI EKANLIGINI tushunish muhim, asl matnni emas.

Keng tarqalgan xatolar:
- Shahar nomlari: "xarshi"→"Qarshi", "tashkent"→"Toshkent", "samarkan"→"Samarqand", "namagan"→"Namangan", "buxara"→"Buxoro", "andijon"→"Andijon", "fargona"→"Farg'ona", "jizzax"→"Jizzax"
- Raqamlar: "ich"/"ish"→"uch(3)", "to'r"→"to'rt(4)", "besh"→"besh(5)", "ikki"→"ikki(2)", "bir"→"bir(1)"
- Mulk turlari: "kvartera"/"kvertira"→"kvartira", "xovli"→"hovli", "yer"→"yer"
- Boshqa: "shaxr"→"shahar", "arzon"→"arzon", "qimmat"→"qimmat"

isSearch=true bo'lishi kerak bo'lgan holatlar:
- Aniq joy ("Toshkentda"), xona soni ("3 xonali"), narx ("500 mln gacha"), kategoriya ("ijara", "sotish")
- "Ko'rsat", "qidir", "top", "ber", "boshqa ko'rsat", "yana ko'rsat", "boshqasi" kabi so'rovlar
- "Boshqa shahardan", "Qarshidan boshqa", "arzonroq", "kattaroq" — ham isSearch=true

isSearch=false faqat: salomlashish, umumiy savol, platforma haqida so'rash.

correctedQuery: xatolarni tuzatib, user nima so'raganini TO'LIQ yozing.
Misol: "xarshi shaxridan ich xonali kvartera" → correctedQuery: "Qarshi shahridan uch xonali kvartira"`;

// Shahar nomlari va ularning rus/ingliz variantlari — cross-language qidiruv uchun
const CITY_ALIASES: Record<string, string[]> = {
  'Qarshi':    ['Qarshi', 'Карши'],
  'Toshkent':  ['Toshkent', 'Ташкент', 'Tashkent'],
  'Samarqand': ['Samarqand', 'Самарканд', 'Samarkand'],
  'Namangan':  ['Namangan', 'Наманган'],
  'Buxoro':    ['Buxoro', 'Бухара', 'Bukhara'],
  'Andijon':   ['Andijon', 'Андижан', 'Andijan'],
  'Fargona':   ["Farg'ona", 'Фергана', 'Fergana'],
  'Jizzax':    ['Jizzax', 'Джизак'],
  'Navoiy':    ['Navoiy', 'Навои'],
  'Nukus':     ['Nukus', 'Нукус'],
  'Termiz':    ['Termiz', 'Термез'],
  'Guliston':  ['Guliston', 'Гулистан'],
  'Sirdaryo':  ['Sirdaryo', 'Сырдарья'],
};

const VOICE_UNIFIED_RESPONSE_FORMAT = `JAVOB FORMAT - STRICTLY JSON:
{
  "correctedQuery": "user so'rovining to'g'rilangan varianti (masalan: Qarshi 3 xonali kvartira ijaraga)",
  "isSearch": true yoki false,
  "reply": "faqat isSearch=false holda qisqa matn, aks holda bo'sh string",
  "extracted": {
    "city": "shahar nomi (to'g'rilangan) yoki null",
    "bedrooms": xona_soni_raqam_yoki_null,
    "propertyType": "kvartira" yoki "hovli" yoki "yer" yoki "ofis" yoki "garaj" yoki null,
    "dealType": "ijara" yoki "sotish" yoki null,
    "minPrice": null,
    "maxPrice": null,
    "currency": null
  }
}
MUHIM: extracted da faqat user ANIQ AYTGAN narsalar bo'lsin. Taxmin qilma — aytmagan bo'lsa null.
Misol: "Qarshi 3 xonali" → city:"Qarshi", bedrooms:3, dealType:null, propertyType:null`;

const HISTORY_LIMIT = 12;
const SEARCH_RESULT_LIMIT = 5;
const VOICE_TTS_VOICE = 'nova';
const VOICE_TTS_FORMAT = 'mp3';
const VOICE_INTRO_MAX_CHARS = 200;

// User voice tilidan ai-property search tiliga mapping
const VOICE_LANG_MAP: Record<string, EnumLanguage> = {
  uz: EnumLanguage.UZ,
  ru: EnumLanguage.RU,
  ms: EnumLanguage.MS,
  en: EnumLanguage.EN,
};

interface ClassifiedReply {
  reply: string;
  isSearch: boolean;
  searchQuery: string;
  correctedQuery: string;
}

interface ExtractedCriteria {
  city?: string | null;
  bedrooms?: number | null;
  propertyType?: string | null;
  dealType?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  currency?: string | null;
}

interface VoiceAnalysis {
  correctedQuery: string;
  isSearch: boolean;
  reply: string;
  extracted: ExtractedCriteria;
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
    let transcript: string;
    try {
      transcript = await this.openai.transcribeAudio({
        buffer: opts.audio,
        filename: opts.filename ?? 'voice.webm',
        mimeType: opts.mimeType,
        language: opts.language,
        model: 'gpt-4o-transcribe',
        priority: true,
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 400) {
        throw new BadRequestException(
          'Audio faylni qayta ishlashda xato. Format yoki fayl sifatini tekshiring.',
        );
      }
      this.logger.warn(`Transcription failed: ${String(err)}`);
      throw new ServiceUnavailableException(
        'Ovozni transkripsiya qilishda xato yuz berdi. Qayta urinib ko\'ring.',
      );
    }

    this.logger.log(`[voice] transcript: "${transcript}" (lang=${opts.language ?? 'auto'})`);

    // 2-AI call: transcript + history → correctedQuery + isSearch + filter (bitta qo'ng'iroq)
    const analyzed = await this.analyzeVoice(
      transcript,
      opts.history ?? [],
      opts.language,
    );

    this.logger.log(
      `[voice] analyze → isSearch=${analyzed.isSearch} correctedQuery="${analyzed.correctedQuery}" extracted=${JSON.stringify(analyzed.extracted)}`,
    );

    // DB query — AI call yo'q, tayyor filter bilan to'g'ridan-to'g'ri qidiruv
    const searchLang = VOICE_LANG_MAP[opts.language ?? ''] ?? EnumLanguage.EN;
    let properties: CompactProperty[] = [];
    if (analyzed.isSearch) {
      const builtFilter = this.buildFilterFromExtracted(analyzed.extracted);
      this.logger.log(`[voice] built filter=${JSON.stringify(builtFilter)}`);
      const result = await this.aiPropertyService.findByRawFilter({
        rawFilter: builtFilter,
        page: 1,
        limit: SEARCH_RESULT_LIMIT,
        language: searchLang,
      });
      properties = result.properties.map((p) =>
        this.toCompact(p as unknown as Record<string, unknown>),
      );
      this.logger.log(`[voice] search → found=${properties.length}`);
    }

    const displayQuery = analyzed.correctedQuery.trim() || transcript;

    let body = analyzed.reply;
    let noResults = false;
    if (analyzed.isSearch && properties.length > 0) {
      body = `Topdim! "${displayQuery}" bo'yicha ${properties.length} ta mulk topildi.`;
    } else if (analyzed.isSearch && properties.length === 0) {
      body = `"${displayQuery}" bo'yicha mos e'lon topilmadi. Hozircha platformada asosan ${this.marketName} ko'chmas mulki mavjud. Boshqa shahar, narx oralig'i yoki kengroq shartlar bilan urinib ko'ring.`;
      noResults = true;
    }

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
        priority: true,
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
      searchQuery: analyzed.isSearch ? displayQuery : undefined,
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

    // 1) Foydalanuvchi xabari (transcript bilan). AI javobini biz qo'shamiz
    //    quyida — appendMessage'dagi avto-reply tetiklanmasligi kerak.
    await this.chatService.createSystemMessage({
      conversationId: opts.conversationId,
      senderId: opts.senderId,
      type: MessageType.TEXT,
      body: result.transcript,
      metadata: { voice: true },
      skipAutoReply: true,
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

  /**
   * Voice unified analysis: bitta AI call bilan transcript → correctedQuery + isSearch + filter.
   * classify() + findByPrompt() AI call'larini birlashtiradi (3 call → 2 call).
   */
  private async analyzeVoice(
    transcript: string,
    history: MessageRecord[],
    language?: string,
  ): Promise<VoiceAnalysis> {
    const system = `${buildAiSystemPrompt(
      this.countryConfig.country,
      this.countryConfig.defaultCurrency,
      this.countryConfig.brandName,
    )}

${VOICE_CORRECTION_SYSTEM}

KALIT SO'ZLARNI AJRATISH QOIDALARI:
- city: shahar nomini aniqlash (xatolarni to'g'irla: "xarshi"→"Qarshi", "tashkent"→"Toshkent", "namagan"→"Namangan")
- bedrooms: xona soni raqam sifatida (ich/ish→3, to'rt→4, besh→5, ikki→2, bir→1)
- propertyType: "kvartira"/"kvartera"/"kvertira"→"kvartira", "hovli"/"xovli"→"hovli", "yer"→"yer", "ofis"→"ofis", "garaj"→"garaj"
- dealType: "ijara"/"ijaraga"/"rent"→"ijara", "sotish"/"sotib olish"/"sale"→"sotish"
- minPrice/maxPrice: narx raqam (million=1000000, mln=1000000, ming=1000)
- currency: so'm/UZS→"UZS", dollar/USD→"USD"

${VOICE_UNIFIED_RESPONSE_FORMAT}`;

    const historyText = history
      .slice(-HISTORY_LIMIT)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const user = historyText
      ? `Oldingi suhbat:\n${historyText}\n\nOxirgi voice transcript (til: ${language ?? 'auto'}): "${transcript}"`
      : `Voice transcript (til: ${language ?? 'auto'}): "${transcript}"`;

    try {
      const { data } = await this.openai.generateJson<{
        correctedQuery?: unknown;
        isSearch?: unknown;
        reply?: unknown;
        extracted?: unknown;
      }>({
        system,
        user,
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 600,
        priority: true,
      });

      const extracted = (data?.extracted && typeof data.extracted === 'object' && !Array.isArray(data.extracted))
        ? (data.extracted as ExtractedCriteria)
        : {};

      return {
        correctedQuery: typeof data?.correctedQuery === "string" ? data.correctedQuery : transcript,
        isSearch: Boolean(data?.isSearch),
        reply: typeof data?.reply === "string" ? data.reply : "",
        extracted,
      };
    } catch (err) {
      this.logger.warn(`[voice] analyzeVoice failed: ${String(err)}`);
      return {
        correctedQuery: transcript,
        isSearch: false,
        reply: "Kechirasiz, so'rovingizni qayta yuboring.",
        extracted: {},
      };
    }
  }

  /** AI extracted criteria dan MongoDB filter quradi — kalit so'zlar asosida */
  private buildFilterFromExtracted(ext: ExtractedCriteria): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    // Shahar: case-insensitive regex, barcha til fieldlarida, rus/ingliz variantlari bilan
    if (ext.city) {
      const aliases = this.findCityAliases(ext.city);
      const orClauses: Record<string, unknown>[] = [];
      for (const lang of ['uz', 'ru', 'en']) {
        for (const alias of aliases) {
          orClauses.push({ [`address.${lang}`]: { $regex: alias, $options: 'i' } });
        }
      }
      if (orClauses.length > 0) filter.$or = orClauses;
    }

    // Xona soni
    if (typeof ext.bedrooms === 'number' && ext.bedrooms > 0) {
      filter.bedrooms = ext.bedrooms;
    }

    // Kategoriya: propertyType + dealType kombinatsiyasi
    const category = this.mapToCategory(ext.propertyType, ext.dealType);
    if (category !== null) filter.category = category;

    // Narx
    if (ext.minPrice || ext.maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (ext.minPrice) priceFilter.$gte = ext.minPrice;
      if (ext.maxPrice) priceFilter.$lte = ext.maxPrice;
      filter.price = priceFilter;
    }

    // Valyuta
    if (ext.currency) filter.currency = ext.currency;

    return filter;
  }

  private findCityAliases(city: string): string[] {
    if (CITY_ALIASES[city]) return CITY_ALIASES[city];
    const lower = city.toLowerCase().replace(/['']/g, '');
    for (const [key, vals] of Object.entries(CITY_ALIASES)) {
      if (key.toLowerCase().replace(/['']/g, '') === lower) return vals;
    }
    return [city];
  }

  private mapToCategory(
    propertyType: string | null | undefined,
    dealType: string | null | undefined,
  ): unknown {
    const type = (propertyType ?? '').toLowerCase();
    const deal = (dealType ?? '').toLowerCase();

    const isRent = deal.includes('ijara') || deal.includes('rent');
    const isSale = deal.includes('sotish') || deal.includes('sale') || deal.includes('sotib');
    const isApartment = type.includes('kvartira') || type.includes('apartment');
    const isHovli = type.includes('hovli');
    const isCommercial = type.includes('ofis') || type.includes('commercial') || type.includes('noturar');
    const isLand = type.includes('yer') || type.includes('land');
    const isGarage = type.includes('garaj') || type.includes('garage');

    if (isApartment && isRent) return 'APARTMENT_RENT';
    if (isApartment && isSale) return 'APARTMENT_SALE';
    if (isApartment) return { $in: ['APARTMENT_RENT', 'APARTMENT_SALE'] };

    if (isHovli && isRent) return 'HOVLI_RENT';
    if (isHovli && isSale) return 'HOVLI_SALE';
    if (isHovli) return { $in: ['HOVLI_SALE', 'HOVLI_RENT'] };

    if (isCommercial && isRent) return 'COMMERCIAL_RENT';
    if (isCommercial && isSale) return 'COMMERCIAL_SALE';
    if (isCommercial) return { $in: ['COMMERCIAL_RENT', 'COMMERCIAL_SALE'] };

    if (isLand && isRent) return 'LAND_RENT';
    if (isLand && isSale) return 'LAND_SALE';
    if (isLand) return { $in: ['LAND_SALE', 'LAND_RENT'] };

    if (isGarage && isRent) return 'GARAGE_RENT';
    if (isGarage && isSale) return 'GARAGE_SALE';
    if (isGarage) return { $in: ['GARAGE_SALE', 'GARAGE_RENT'] };

    if (isRent) return { $in: ['APARTMENT_RENT', 'HOVLI_RENT', 'COMMERCIAL_RENT'] };
    if (isSale) return { $in: ['APARTMENT_SALE', 'HOVLI_SALE', 'COMMERCIAL_SALE'] };

    return null;
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
        body: `Salom! Men ${this.countryConfig.brandName} AI yordamchisiman 🤖\n\nHozircha asosan ${this.marketName} ko'chmas mulki bo'yicha yordam beraman.\n\nMulk qidirish uchun oddiy tilda yozing:\n${examples}\n\nYoki platforma haqida savol bering.`,
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

    const system = `${buildAiSystemPrompt(
      this.countryConfig.country,
      this.countryConfig.defaultCurrency,
      this.countryConfig.brandName,
    )}\n\n${RESPONSE_SCHEMA_PROMPT}`;

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
            : 'Uzr, sizni to’liq tushunmadim. Qayta yozib ko’ring.',
        isSearch: Boolean(data?.isSearch),
        searchQuery:
          typeof data?.searchQuery === 'string' ? data.searchQuery : '',
        correctedQuery:
          typeof data?.correctedQuery === 'string' ? data.correctedQuery : '',
      };
    } catch (err) {
      this.logger.warn(`AI classify failed: ${String(err)}`);
      return {
        reply: 'Kechirasiz, savolingizni qayta yuboring.',
        isSearch: false,
        searchQuery: '',
        correctedQuery: '',
      };
    }
  }

  private async searchProperties(
    query: string,
    language: EnumLanguage = EnumLanguage.EN,
  ): Promise<CompactProperty[]> {
    try {
      const res = await this.aiPropertyService.findByPrompt({
        userPrompt: query,
        page: 1,
        limit: SEARCH_RESULT_LIMIT,
        language,
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
