/**
 * Background-side page content map keyed by tabId and URL. Receives
 * PAGE_CONTENT_CACHED messages from content scripts; serves cached text
 * to the LLM context builder (ADR-021 §4).
 */

import { normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface PageContent {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
  originalLength: number;
  pushedAt: number;
}

interface BackgroundPageContentCacheOptions {
  ttlMs?: number;
}

export class BackgroundPageContentCache {
  private readonly byTabId = new Map<number, PageContent>();
  private readonly byUrl = new Map<string, PageContent>();

  constructor(private readonly opts: BackgroundPageContentCacheOptions = {}) {}

  set(tabId: number, content: PageContent): void {
    this.byTabId.set(tabId, content);
    this.byUrl.set(normalizePageUrl(content.url), content);
  }

  getByTabId(tabId: number): PageContent | null {
    const entry = this.byTabId.get(tabId);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.evictTab(tabId);
      return null;
    }
    return entry;
  }

  getByUrl(url: string): PageContent | null {
    const entry = this.byUrl.get(normalizePageUrl(url));
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.evictUrl(normalizePageUrl(url));
      return null;
    }
    return entry;
  }

  /** Remove tab mapping only; URL cache survives until TTL for popup lookups. */
  deleteTab(tabId: number): void {
    this.byTabId.delete(tabId);
  }

  private isExpired(entry: PageContent): boolean {
    const ttl = this.opts.ttlMs ?? 30 * 60 * 1000;
    return Date.now() - entry.pushedAt > ttl;
  }

  private evictTab(tabId: number): void {
    this.byTabId.delete(tabId);
  }

  private evictUrl(normalizedUrl: string): void {
    this.byUrl.delete(normalizedUrl);
    for (const [tabId, entry] of this.byTabId) {
      if (normalizePageUrl(entry.url) === normalizedUrl) {
        this.byTabId.delete(tabId);
      }
    }
  }
}
