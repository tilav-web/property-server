import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppVersion, AppVersionDocument, AppPlatform } from './app-version.schema';
import { UpsertAppVersionDto } from './dto/upsert-app-version.dto';

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
  constructor(
    @InjectModel(AppVersion.name)
    private readonly model: Model<AppVersionDocument>,
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
    return this.model.findOneAndUpdate(
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
    ) as Promise<AppVersionDocument>;
  }
}
