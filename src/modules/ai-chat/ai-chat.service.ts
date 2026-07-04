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
import { EnumAmenities } from 'src/enums/amenities.enum';
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
  const examplePrice = country === 'UZ' ? "500 mln so'mgacha" : '5 lakhgacha';

  return `Sen ${brand} platformasining AI yordamchisisan.
Platforma ${market} ko'chmas mulk bozori uchun ishlaydi (sotib olish, ijara, ipoteka).
Asosiy valyuta: ${currency}.

Vazifang:
- Foydalanuvchi xabaridan mulk qidiruv kalit so'zlarini ajratish (shahar, xona soni, narx, tur, ijara/sotish)
- Bor kalit so'zlar bilan DARHOL qidiruv qilish uchun extracted'ni to'ldirish

ENG MUHIM QOIDA — HECH QACHON QO'SHIMCHA MA'LUMOT TALAB QILMA:
- "To'liq ma'lumot bering", "aniqroq yozing", "qaysi shahar?", "yana nimadir qo'shing" kabi javoblar TAQIQLANGAN
- BITTA kalit so'z ham qidiruv uchun yetarli: "3 xonali kvartira kerak" → isSearch=true, bedrooms=3
- "2 milliongacha kvartira" → isSearch=true, maxPrice=2000000 — shahar so'ramasdan darhol qidir
- Yetishmagan ma'lumotni so'rab o'tirmaslik — bor narsa bilan qidiruv, xolos

isSearch qoidalari:
- Mulkka oid HAR QANDAY belgi bo'lsa isSearch=true: joy ("${exampleCity}"), xona ("2 xonali"), narx ("${examplePrice}"), tur ("kvartira", "hovli", "${exampleArea} ijara"), "ko'rsat/top/qidir/boshqa/arzonroq/kattaroq"
- isSearch=false FAQAT: salomlashish, platforma haqida savol, mulkka aloqasi yo'q umumiy suhbat
- reply faqat isSearch=false holda yoziladi va foydalanuvchi tilida bo'lsin (uz/ru/en/ms — yozuvidan aniqla)
- Shaxsiy ma'lumot so'rama`;
}

// Yozuv/transkripsiya xatolarini tuzatish uchun system prompt qo'shimchasi
const CORRECTION_SYSTEM = `
XATOLARNI TUZATISH:
User xabari xato yozilgan yoki ovozdan xato transkript qilingan bo'lishi mumkin.
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
  Qarshi: ['Qarshi', 'Карши'],
  Toshkent: ['Toshkent', 'Ташкент', 'Tashkent'],
  Samarqand: ['Samarqand', 'Самарканд', 'Samarkand'],
  Namangan: ['Namangan', 'Наманган'],
  Buxoro: ['Buxoro', 'Бухара', 'Bukhara'],
  Andijon: ['Andijon', 'Андижан', 'Andijan'],
  Fargona: ["Farg'ona", 'Фергана', 'Fergana'],
  Jizzax: ['Jizzax', 'Джизак'],
  Navoiy: ['Navoiy', 'Навои'],
  Nukus: ['Nukus', 'Нукус'],
  Termiz: ['Termiz', 'Термез'],
  Guliston: ['Guliston', 'Гулистан'],
  Sirdaryo: ['Sirdaryo', 'Сырдарья'],
};

const UNIFIED_RESPONSE_FORMAT = `JAVOB FORMAT - STRICTLY JSON:
{
  "correctedQuery": "user so'rovining to'g'rilangan, jamlangan varianti (masalan: Qarshi 3 xonali kvartira ijaraga)",
  "isSearch": true yoki false,
  "reply": "faqat isSearch=false holda qisqa matn, aks holda bo'sh string",
  "extracted": {
    "city": "shahar nomi (to'g'rilangan) yoki null",
    "bedrooms": xona_soni_raqam_yoki_null,
    "propertyType": "kvartira" yoki "hovli" yoki "yer" yoki "ofis" yoki "garaj" yoki null,
    "dealType": "ijara" yoki "sotish" yoki null,
    "minPrice": null,
    "maxPrice": null,
    "currency": null,
    "furnished": true/false/null,
    "amenities": ["POOL"] kabi ro'yxat yoki null
  }
}
MUHIM: extracted da faqat user AYTGAN narsalar bo'lsin. Taxmin qilma — aytmagan bo'lsa null.
amenities faqat shu qiymatlardan: "pool", "balcony", "security", "air_conditioning", "parking", "elevator" (basseyn→pool, balkon→balcony, konditsioner→air_conditioning, avtoturargoh/parkovka→parking, lift→elevator).
Misol: "Qarshi 3 xonali" → city:"Qarshi", bedrooms:3, dealType:null, propertyType:null

XOTIRA VA MERGE QOIDASI (juda muhim):
- extracted — faqat oxirgi xabardan EMAS, BUTUN suhbatdan JAMLANGAN holat
- Oldingi xabarlarda aytilgan kriteriylar (shahar, xona, narx, tur) SAQLANADI
- Yangi xabar oldingi qiymatga zid bo'lsa — YANGISI olinadi ("aslida 3 xonali" → bedrooms=3)
- User mavzuni butunlay o'zgartirsa (masalan endi boshqa turdagi mulk so'rasa) — eski mos kelmaydigan kriteriylarni tashla
- MUHIM ISTISNO: agar yangi xabarda OLDINGISIDAN BOSHQA SHAHAR aytilsa, bu odatda YANGI, mustaqil qidiruv demakdir — eski narx (minPrice/maxPrice) va mebel/qulaylik kabi mezonlarni SAQLAMA, faqat yangi xabarda va undan oldingi (hali ham mos) xona soni/tur kabi umumiy mezonlarni ol. Narx odatda shaharga bog'liq bo'lgani uchun eski shahar uchun aytilgan narxni yangi shaharga ko'chirish noto'g'ri.
- correctedQuery ham jamlangan holatni aks ettirsin

Misol (xotira):
User: "menga 2 xonali kvartira kerak" → extracted: {bedrooms:2, propertyType:"kvartira"}
Assistant: (natijalar)
User: "qarshi shahridan" → extracted: {city:"Qarshi", bedrooms:2, propertyType:"kvartira"} ← oldingilari SAQLANDI
User: "3 xonalisi ham bo'ladi" → extracted: {city:"Qarshi", bedrooms:3, propertyType:"kvartira"}

Misol (shahar o'zgarsa, narx tashlanadi):
User: "Toshkentda 100 mln gacha kvartira" → extracted: {city:"Toshkent", maxPrice:100000000, propertyType:"kvartira"}
Assistant: (natijalar)
User: "qarshi shahridan 3 xonali" → extracted: {city:"Qarshi", bedrooms:3, propertyType:"kvartira"} ← maxPrice:100000000 TASHLANDI (boshqa shahar)`;

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

interface ExtractedCriteria {
  city?: string | null;
  bedrooms?: number | null;
  propertyType?: string | null;
  dealType?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  currency?: string | null;
  furnished?: boolean | null;
  amenities?: string[] | null;
}

interface ConversationAnalysis {
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

      const outcome = await this.runSearchFlow(history);

      await this.chatService.createSystemMessage({
        conversationId,
        senderId: aiUserId,
        type: MessageType.TEXT,
        body: outcome.body,
        metadata: outcome.metadata,
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

    const outcome = await this.runSearchFlow(safeHistory);

    return {
      body: outcome.body,
      properties:
        outcome.properties.length > 0 ? outcome.properties : undefined,
      searchQuery: outcome.searchQuery,
      noResults: outcome.noResults || undefined,
    };
  }

  /**
   * Text chat uchun umumiy oqim: suhbatdan kalit so'zlarni ajratish (merge
   * bilan) → deterministik filter → DB qidiruv → server tomonda javob matni.
   * AI'dan "qo'shimcha ma'lumot bering" kabi javob kelishi mumkin emas —
   * javob matnini AI emas, server quradi.
   */
  private async runSearchFlow(history: MessageRecord[]): Promise<{
    body: string;
    properties: CompactProperty[];
    searchQuery?: string;
    noResults: boolean;
    metadata?: Record<string, unknown>;
  }> {
    const latest =
      [...history].reverse().find((m) => m.role === 'user')?.content ?? '';

    const analyzed = await this.analyzeConversation({
      history,
      latest,
      voiceMode: false,
    });

    this.logger.log(
      `[text] analyze → isSearch=${analyzed.isSearch} correctedQuery="${analyzed.correctedQuery}" extracted=${JSON.stringify(analyzed.extracted)}`,
    );

    if (!analyzed.isSearch) {
      return {
        body:
          analyzed.reply.trim() ||
          'Salom! Mulk qidirish uchun shahar, xona soni yoki narxni yozing.',
        properties: [],
        noResults: false,
      };
    }

    let properties: CompactProperty[] = [];
    let priceRelaxed = false;
    const builtFilter = this.buildFilterFromExtracted(analyzed.extracted);
    if (Object.keys(builtFilter).length > 0) {
      const found = await this.findPropertiesWithFallback(
        builtFilter,
        EnumLanguage.EN,
      );
      properties = found.properties;
      priceRelaxed = found.relaxed;
    } else {
      // Structured filter bo'sh — murakkab so'rovlar uchun eski AI-filter yo'li
      properties = await this.searchProperties(
        analyzed.correctedQuery.trim() || latest,
      );
    }

    const displayQuery = analyzed.correctedQuery.trim() || latest;
    const noResults = properties.length === 0;
    const body = this.composeSearchBody({
      found: properties.length,
      ext: analyzed.extracted,
      priceRelaxed,
    });

    const metadata: Record<string, unknown> = { searchQuery: displayQuery };
    if (properties.length > 0) metadata.properties = properties;
    else metadata.noResults = true;

    return {
      body,
      properties,
      searchQuery: displayQuery,
      noResults,
      metadata,
    };
  }

  /**
   * Qidiruv natijasi uchun TABIIY, insoniy ohangdagi javob matni.
   * Foydalanuvchi yozgan matnni tirnoq ichida qaytarmaymiz (bu robotga
   * o'xshab qolar edi) — o'rniga topilgan mezonlarni (shahar, xona, tur)
   * oddiy gap qilib, keyin qisqa samimiy taklif bilan tugatamiz. Bir nechta
   * variant orasidan tasodifiy tanlanadi — har doim bir xil gap
   * takrorlanmasin.
   */
  private composeSearchBody(opts: {
    found: number;
    ext: ExtractedCriteria;
    priceRelaxed?: boolean;
  }): string {
    const phrase = this.naturalCriteriaPhrase(opts.ext);

    if (opts.found > 0 && opts.priceRelaxed) {
      return `Aytilgan narxda ${phrase} topilmadi, lekin yaqinroq variantlar bor ekan (${opts.found} ta). Ko'rib chiqasizmi?`;
    }

    if (opts.found > 0) {
      const templates = [
        `${phrase} bor ekan (${opts.found} ta). Sizga bu maqul keladimi? Istasangiz aniq manzil bilan yordam beraman.`,
        `Ha, ${phrase} topildi — ${opts.found} ta variant bor. Ko'rib chiqing, birortasi yoqsa batafsil ma'lumot beraman.`,
        `${phrase} bo'yicha ${opts.found} ta mos variant topdim. Qaysidir yoqsa aytavering.`,
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    const notFoundTemplates = [
      `Uzr, ${phrase} topa olmadim. Boshqa shahar yoki narxda urinib ko'raymi?`,
      `Afsuski, hozircha ${phrase} yo'q ekan. Boshqa shartlar bilan qidiraymi?`,
    ];
    return notFoundTemplates[
      Math.floor(Math.random() * notFoundTemplates.length)
    ];
  }

  /** Ajratilgan mezonlardan (shahar, xona, tur, bitim) tabiiy o'zbekcha gap qismi quradi. */
  private naturalCriteriaPhrase(ext: ExtractedCriteria): string {
    const parts: string[] = [];
    if (ext.city) parts.push(`${ext.city} shahridan`);
    if (typeof ext.bedrooms === 'number' && ext.bedrooms > 0) {
      parts.push(`${ext.bedrooms} xonali`);
    }
    parts.push(ext.propertyType || 'mulk');

    const suffix =
      ext.dealType === 'ijara'
        ? ' (ijaraga)'
        : ext.dealType === 'sotish'
          ? ' (sotish uchun)'
          : '';

    return parts.join(' ') + suffix;
  }

  /** extracted'da qidiruv uchun ishlatsa bo'ladigan kamida bitta mezon bormi. */
  private hasActionableCriteria(ext: ExtractedCriteria): boolean {
    return Boolean(
      ext.city ||
        ext.propertyType ||
        ext.dealType ||
        (typeof ext.bedrooms === 'number' && ext.bedrooms > 0) ||
        ext.minPrice ||
        ext.maxPrice ||
        (Array.isArray(ext.amenities) && ext.amenities.length > 0),
    );
  }

  /**
   * Model ba'zan (temperature > 0 tufayli barqaror emas) oxirgi xabarda
   * aniq yozilgan shahar/mulk turini ham extracted'ga qo'ymay qoladi —
   * masalan "Toshkentdan kvartira bormi" so'roviga extracted={} qaytarishi
   * mumkin. Bu holatlarni model qaytarishiga umuman ishonmasdan, oddiy
   * kalit so'z qidiruvi bilan to'ldiramiz (qo'shimcha AI chaqiruvisiz,
   * darhol va bepul).
   */
  private fallbackExtractFromText(
    text: string,
    extracted: ExtractedCriteria,
  ): ExtractedCriteria {
    const lower = text.toLowerCase();
    const result = { ...extracted };

    if (!result.city) {
      for (const [cityName, aliases] of Object.entries(CITY_ALIASES)) {
        if (aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
          result.city = cityName;
          break;
        }
      }
    }

    if (!result.propertyType) {
      const typeKeywords: Array<[string[], string]> = [
        [['kvartira', 'kvartera', 'kvertira'], 'kvartira'],
        [['hovli', 'xovli'], 'hovli'],
        [['ofis'], 'ofis'],
        [['garaj'], 'garaj'],
        [['yer'], 'yer'],
      ];
      for (const [keywords, type] of typeKeywords) {
        if (keywords.some((kw) => lower.includes(kw))) {
          result.propertyType = type;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Filter bilan qidiradi; agar natija bo'sh chiqsa VA filterda narx
   * cheklovi bo'lsa, narxni olib tashlab qayta qidiradi. Suhbat xotirasida
   * eski narx cheklovi qolib ketgan bo'lishi mumkin (masalan foydalanuvchi
   * ancha oldin "100 mln gacha" degan, keyin butunlay boshqa shahar
   * so'ragan) — bu holda natijalarni sababsiz yo'qotib qo'yish o'rniga,
   * inson agent kabi "bu narxda yo'q, lekin yaqinlarini ko'rsataman" deb
   * yumshatib qidiramiz.
   */
  private async findPropertiesWithFallback(
    builtFilter: Record<string, unknown>,
    language: EnumLanguage,
  ): Promise<{ properties: CompactProperty[]; relaxed: boolean }> {
    const result = await this.aiPropertyService.findByRawFilter({
      rawFilter: builtFilter,
      page: 1,
      limit: SEARCH_RESULT_LIMIT,
      language,
    });
    const properties = result.properties.map((p) =>
      this.toCompact(p as unknown as Record<string, unknown>),
    );
    if (properties.length > 0 || !builtFilter.price) {
      return { properties, relaxed: false };
    }

    const withoutPrice: Record<string, unknown> = {};
    for (const key of Object.keys(builtFilter)) {
      if (key !== 'price') withoutPrice[key] = builtFilter[key];
    }
    const relaxedResult = await this.aiPropertyService.findByRawFilter({
      rawFilter: withoutPrice,
      page: 1,
      limit: SEARCH_RESULT_LIMIT,
      language,
    });
    const relaxedProperties = relaxedResult.properties.map((p) =>
      this.toCompact(p as unknown as Record<string, unknown>),
    );
    return {
      properties: relaxedProperties,
      relaxed: relaxedProperties.length > 0,
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
        "Ovozni transkripsiya qilishda xato yuz berdi. Qayta urinib ko'ring.",
      );
    }

    this.logger.log(
      `[voice] transcript: "${transcript}" (lang=${opts.language ?? 'auto'})`,
    );

    // 2-AI call: transcript + history → correctedQuery + isSearch + filter (bitta qo'ng'iroq)
    const analyzed = await this.analyzeConversation({
      history: opts.history ?? [],
      latest: transcript,
      voiceMode: true,
      language: opts.language,
    });

    this.logger.log(
      `[voice] analyze → isSearch=${analyzed.isSearch} correctedQuery="${analyzed.correctedQuery}" extracted=${JSON.stringify(analyzed.extracted)}`,
    );

    // DB query — AI call yo'q, tayyor filter bilan to'g'ridan-to'g'ri qidiruv
    const searchLang = VOICE_LANG_MAP[opts.language ?? ''] ?? EnumLanguage.EN;
    let properties: CompactProperty[] = [];
    let priceRelaxed = false;
    if (analyzed.isSearch) {
      const builtFilter = this.buildFilterFromExtracted(analyzed.extracted);
      this.logger.log(`[voice] built filter=${JSON.stringify(builtFilter)}`);
      const found = await this.findPropertiesWithFallback(
        builtFilter,
        searchLang,
      );
      properties = found.properties;
      priceRelaxed = found.relaxed;
      this.logger.log(`[voice] search → found=${properties.length}`);
    }

    const displayQuery = analyzed.correctedQuery.trim() || transcript;

    let body = analyzed.reply;
    let noResults = false;
    if (analyzed.isSearch) {
      body = this.composeSearchBody({
        found: properties.length,
        ext: analyzed.extracted,
        priceRelaxed,
      });
      noResults = properties.length === 0;
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
   * Unified analysis (text + voice): bitta AI call bilan oxirgi xabar +
   * suhbat tarixi → correctedQuery + isSearch + JAMLANGAN extracted filter.
   * Tarix orqali "xotira": oldin aytilgan kriteriylar (shahar, xona, narx)
   * yangi xabar bilan birlashtiriladi.
   */
  private async analyzeConversation(opts: {
    history: MessageRecord[];
    latest: string;
    voiceMode: boolean;
    language?: string;
  }): Promise<ConversationAnalysis> {
    const { history, latest, voiceMode, language } = opts;

    const system = `${buildAiSystemPrompt(
      this.countryConfig.country,
      this.countryConfig.defaultCurrency,
      this.countryConfig.brandName,
    )}

${CORRECTION_SYSTEM}

KALIT SO'ZLARNI AJRATISH QOIDALARI:
- city: shahar nomini aniqlash (xatolarni to'g'irla: "xarshi"→"Qarshi", "tashkent"→"Toshkent", "namagan"→"Namangan")
- bedrooms: xona soni raqam sifatida (ich/ish→3, to'rt→4, besh→5, ikki→2, bir→1)
- propertyType: "kvartira"/"kvartera"/"kvertira"→"kvartira", "hovli"/"xovli"→"hovli", "yer"→"yer", "ofis"→"ofis", "garaj"→"garaj"
- dealType: FAQAT aniq aytilganda — "ijara"/"ijaraga"/"arenda"/"rent"→"ijara", "sotib olish"/"sotib olaman"/"sale"→"sotish". "kerak"/"qidiryapman" kabi so'zlardan dealType TAXMIN QILINMAYDI — null qoladi
- minPrice/maxPrice: narx raqam (million=1000000, mln=1000000, ming=1000; "2 milliongacha"→maxPrice=2000000; "1 mln dan 3 mln gacha"→minPrice=1000000, maxPrice=3000000)
- currency: FAQAT user valyutani o'zi aytganda — so'm/UZS→"UZS", dollar/USD→"USD", ringgit/RM→"MYR". Aytmasa null — hech qachon taxmin qilma
- furnished: "mebelli"/"jihozlangan"→true, "mebelsiz"→false
- amenities: aytilgan qulayliklar ro'yxati

${UNIFIED_RESPONSE_FORMAT}`;

    // Oxirgi xabar tarixning oxirida bo'lsa, takrorlamaslik uchun kesamiz
    const priorHistory = history.slice(-HISTORY_LIMIT);
    const trimmed =
      priorHistory.length > 0 &&
      priorHistory[priorHistory.length - 1].role === 'user' &&
      priorHistory[priorHistory.length - 1].content === latest
        ? priorHistory.slice(0, -1)
        : priorHistory;

    const historyText = trimmed
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const sourceLabel = voiceMode
      ? `Oxirgi voice transcript (til: ${language ?? 'auto'})`
      : 'Oxirgi User xabari';

    const user = historyText
      ? `Oldingi suhbat:\n${historyText}\n\n${sourceLabel}: "${latest}"`
      : `${sourceLabel}: "${latest}"`;

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
        priority: voiceMode,
      });

      const rawExtracted =
        data?.extracted &&
        typeof data.extracted === 'object' &&
        !Array.isArray(data.extracted)
          ? (data.extracted as ExtractedCriteria)
          : {};
      const extracted = this.fallbackExtractFromText(latest, rawExtracted);

      return {
        correctedQuery:
          typeof data?.correctedQuery === 'string'
            ? data.correctedQuery
            : latest,
        // Model ba'zan "X bormi?" kabi savol shaklidagi xabarlarda
        // extracted'ni to'g'ri to'ldiradi (masalan city+propertyType), lekin
        // isSearch=false deb noto'g'ri belgilaydi (savol deb qabul qilib).
        // extracted'da haqiqatan foydali mezon bo'lsa, isSearch'ni kod
        // darajasida kafolatlab qo'yamiz — modelning bitta maydoni
        // (isSearch) boshqa maydoni (extracted) bilan ziddiyatga
        // qolmasligi kerak.
        isSearch:
          Boolean(data?.isSearch) || this.hasActionableCriteria(extracted),
        reply: typeof data?.reply === 'string' ? data.reply : '',
        extracted,
      };
    } catch (err) {
      this.logger.warn(`analyzeConversation failed: ${String(err)}`);
      return {
        correctedQuery: latest,
        isSearch: false,
        reply: "Kechirasiz, so'rovingizni qayta yuboring.",
        extracted: {},
      };
    }
  }

  /** AI extracted criteria dan MongoDB filter quradi — kalit so'zlar asosida */
  private buildFilterFromExtracted(
    ext: ExtractedCriteria,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    // Shahar: case-insensitive regex, barcha til fieldlarida, rus/ingliz variantlari bilan
    if (ext.city) {
      const aliases = this.findCityAliases(ext.city);
      const orClauses: Record<string, unknown>[] = [];
      for (const lang of ['uz', 'ru', 'en']) {
        for (const alias of aliases) {
          orClauses.push({
            [`address.${lang}`]: { $regex: alias, $options: 'i' },
          });
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

    // Valyuta ataylab filterga QO'SHILMAYDI: bitta mamlakat deploy'ida barcha
    // e'lonlar bir valyutada, model esa ba'zan taxmin qilib natijani 0 qiladi.

    // Mebel
    if (typeof ext.furnished === 'boolean') filter.furnished = ext.furnished;

    // Qulayliklar — faqat haqiqiy enum qiymatlari o'tkaziladi
    if (Array.isArray(ext.amenities) && ext.amenities.length > 0) {
      const validAmenities = ext.amenities.filter((a) =>
        (Object.values(EnumAmenities) as string[]).includes(a),
      );
      if (validAmenities.length > 0) {
        filter.amenities = { $all: validAmenities };
      }
    }

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
    const isSale =
      deal.includes('sotish') ||
      deal.includes('sale') ||
      deal.includes('sotib');
    const isApartment = type.includes('kvartira') || type.includes('apartment');
    const isHovli = type.includes('hovli');
    const isCommercial =
      type.includes('ofis') ||
      type.includes('commercial') ||
      type.includes('noturar');
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

    if (isRent)
      return { $in: ['APARTMENT_RENT', 'HOVLI_RENT', 'COMMERCIAL_RENT'] };
    if (isSale)
      return { $in: ['APARTMENT_SALE', 'HOVLI_SALE', 'COMMERCIAL_SALE'] };

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
