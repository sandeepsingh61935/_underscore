/**
 * Background-side page content map keyed by tabId. Receives PAGE_CONTENT_CACHED
 * messages from content scripts; serves the cached text to the LLM relay.
 */

interface PageContent {
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
  private store = new Map<number, PageContent>();

  constructor(private readonly opts: BackgroundPageContentCacheOptions = {}) {}

  set(tabId: number, content: PageContent): void {
    this.store.set(tabId, content);
  }

  get(tabId: number): PageContent | null {
    const entry = this.store.get(tabId);
    if (!entry) return null;
    const ttl = this.opts.ttlMs ?? 30 * 60 * 1000;
    if (Date.now() - entry.pushedAt > ttl) {
      this.store.delete(tabId);
      return null;
    }
    return entry;
  }

  delete(tabId: number): void {
    this.store.delete(tabId);
  }
}