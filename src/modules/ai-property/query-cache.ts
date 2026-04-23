import { Injectable } from '@nestjs/common';
import type { SanitizedQuery } from './query-sanitizer';

interface CacheEntry {
  query: SanitizedQuery;
  expiresAt: number;
}

@Injectable()
export class AiQueryCache {
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly maxEntries = 500;
  private readonly store = new Map<string, CacheEntry>();

  private makeKey(prompt: string, language: string): string {
    return `${language}::${prompt.trim().toLowerCase()}`;
  }

  get(prompt: string, language: string): SanitizedQuery | null {
    const key = this.makeKey(prompt, language);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.query;
  }

  set(prompt: string, language: string, query: SanitizedQuery): void {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(this.makeKey(prompt, language), {
      query,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
