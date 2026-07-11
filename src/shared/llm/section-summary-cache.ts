import type { SectionDigest } from '@/shared/llm/summary-request';

const CACHE_KEY = 'llm.sectionSummaryCache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  domain: string;
  sectionKey: string;
  summary: string;
  highlightCount: number;
  updatedAt: number;
}

interface CacheStore {
  entries: CacheEntry[];
}

function cacheKey(domain: string, sectionKey: string): string {
  return `${domain}\0${sectionKey}`;
}

async function readStore(): Promise<CacheStore> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return { entries: [] };
  const result = await chrome.storage.local.get(CACHE_KEY);
  const store = result[CACHE_KEY] as CacheStore | undefined;
  if (!store?.entries) return { entries: [] };
  const cutoff = Date.now() - CACHE_TTL_MS;
  return { entries: store.entries.filter(e => e.updatedAt >= cutoff) };
}

async function writeStore(store: CacheStore): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await chrome.storage.local.set({ [CACHE_KEY]: store });
}

export async function getCachedSectionSummary(
  domain: string,
  sectionKey: string,
  highlightCount: number,
): Promise<string | null> {
  const store = await readStore();
  const entry = store.entries.find(
    e => e.domain === domain && e.sectionKey === sectionKey && e.highlightCount === highlightCount,
  );
  return entry?.summary ?? null;
}

export async function setCachedSectionSummary(
  domain: string,
  sectionKey: string,
  highlightCount: number,
  summary: string,
): Promise<void> {
  const store = await readStore();
  const key = cacheKey(domain, sectionKey);
  const filtered = store.entries.filter(e => cacheKey(e.domain, e.sectionKey) !== key);
  filtered.push({
    domain,
    sectionKey,
    summary,
    highlightCount,
    updatedAt: Date.now(),
  });
  await writeStore({ entries: filtered.slice(-200) });
}

export function toSectionDigests(
  items: Array<{ sectionKey: string; summary: string; highlightCount: number }>,
): SectionDigest[] {
  return items.map(item => ({
    sectionKey: item.sectionKey,
    summary: item.summary,
    highlightCount: item.highlightCount,
  }));
}
