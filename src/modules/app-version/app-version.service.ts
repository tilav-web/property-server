import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppVersion, AppVersionDocument, AppPlatform } from './app-version.schema';
import { UpsertAppVersionDto } from './dto/upsert-app-version.dto';
import { PushTokenService } from '../push/push-token.service';
import { FcmService } from '../push/fcm.service';
import {
  BroadcastNotification,
  BroadcastNotificationDocument,
  BroadcastTargetGroup,
} from '../push/schemas/broadcast-notification.schema';

function parseVersion(v: string): number[] {
  return v.split('.').map(Number);
}

/** true → stored > current → update talab qilinadi */
function isNewer(stored: string, current: string): boolean {
  const s = parseVersion(stored);
  const c = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if ((s[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((s[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}

@Injectable()
export class AppVersionService {
  private readonly logger = new Logger(AppVersionService.name);

  constructor(
    @InjectModel(AppVersion.name)
    private readonly model: Model<AppVersionDocument>,
    @InjectModel(BroadcastNotification.name)
    private readonly broadcastModel: Model<BroadcastNotificationDocument>,
    private readonly pushTokenService: PushTokenService,
    private readonly fcmService: FcmService,
  ) {}

  async getForPlatform(
    platform: AppPlatform,
    currentVersion?: string,
  ): Promise<{
    platform: AppPlatform;
    latest_version: string;
    store_url: string;
    is_force_update: boolean;
    release_notes: string | null;
    needs_update: boolean;
  } | null> {
    const doc = await this.model.findOne({ platform }).lean();
    if (!doc) return null;

    const needs_update = currentVersion
      ? isNewer(doc.version, currentVersion)
      : false;

    return {
      platform: doc.platform,
      latest_version: doc.version,
      store_url: doc.store_url,
      is_force_update: doc.is_force_update,
      release_notes: doc.release_notes,
      needs_update,
    };
  }

  async getAll(): Promise<AppVersionDocument[]> {
    return this.model.find().sort({ platform: 1 }).lean() as Promise<AppVersionDocument[]>;
  }

  async upsert(dto: UpsertAppVersionDto): Promise<AppVersionDocument> {
    const previous = await this.model
      .findOne({ platform: dto.platform }, { version: 1 })
      .lean();

    const updated = (await this.model.findOneAndUpdate(
      { platform: dto.platform },
      {
        $set: {
          version: dto.version,
          store_url: dto.store_url,
          is_force_update: dto.is_force_update ?? false,
          release_notes: dto.release_notes ?? null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )) as AppVersionDocument;

    // Faqat versiya haqiqatan o'zgarganda va release_notes yozilganda
    // xabar yuboramiz — aks holda har bir kichik saqlash (masalan faqat
    // is_force_update belgisini o'zgartirish) userlarga bildirishnoma
    // yuborib yubormasligi kerak.
    const versionChanged = previous?.version !== dto.version;
    if (versionChanged && dto.release_notes?.trim()) {
      void this.broadcastVersionUpdate(dto.platform, dto.version, dto.release_notes);
    }

    return updated;
  }

  /**
   * Yangi versiya release_notes bilan saqlanganda barcha foydalanuvchilarga
   * FCM push + in-app broadcast yuboradi. Fire-and-forget — admin panelga
   * versiya saqlash javobini bloklamaydi.
   */
  private async broadcastVersionUpdate(
    platform: AppPlatform,
    version: string,
    releaseNotes: string,
  ): Promise<void> {
    try {
      const tokens = await this.pushTokenService.findAllUserTokens();
      const title = `Yangi versiya chiqdi: ${version}`;

      const sentCount = await this.fcmService.sendToTokens(tokens, {
        title,
        body: releaseNotes,
        data: { type: 'app_version_update', platform, version },
      });

      await this.broadcastModel.create({
        title,
        body: releaseNotes,
        targetGroup: BroadcastTargetGroup.ALL,
        sentCount,
      });
    } catch (err) {
      this.logger.warn(
        `Versiya yangilanishi xabari yuborilmadi (${platform} ${version}): ${(err as Error).message}`,
      );
    }
  }
}
