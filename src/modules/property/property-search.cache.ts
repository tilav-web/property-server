import { Global, Injectable, Module } from '@nestjs/common';
import { createHash } from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class PropertySearchCache {
  private readonly ttlMs = 60 * 1000;
  private readonly maxEntries = 500;
  private readonly store = new Map<string, CacheEntry<unknown>>();

  makeKey(payload: unknown): string {
    return createHash('md5').update(JSON.stringify(payload)).digest('hex');
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(): void {
    this.store.clear();
  }
}

@Global()
@Module({
  providers: [PropertySearchCache],
  exports: [PropertySearchCache],
})
export class PropertySearchCacheModule {}
