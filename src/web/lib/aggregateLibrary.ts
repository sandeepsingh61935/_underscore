/**
 * @file aggregateLibrary.ts
 * @description Pure aggregation of web library highlights into domains, stats, recent, current page.
 */

export type WebHighlight = {
  id: string;
  domain: string;
  path: string;
  quote: string;
  note: string;
  tags: string[];
  savedAt: number; // ms
  /** True when body is ciphertext-only client-side (skip BM25 plaintext). */
  encrypted?: boolean;
};

export type WebDomainNode = {
  domain: string;
  count: number;
  lastActive: number;
  sections: { path: string; count: number }[];
};

export type WebLibraryStats = {
  highlightCount: number;
  pageCount: number;
  thisWeekCount: number;
  /** Highlights with a non-empty trimmed note. */
  notesCount: number;
  /** Unique tags after trim + case-insensitive dedupe. */
  tagCount: number;
  planLabel: string;
};

export type WebCurrentPage = {
  domain: string;
  path: string;
  sectionLabel: string;
  highlightCount: number;
} | null;

export type WebLibraryAggregate = {
  domains: WebDomainNode[];
  stats: WebLibraryStats;
  recent: WebHighlight[];
  currentPage: WebCurrentPage;
  highlightCount: number;
};

const DEFAULT_RECENT_CAP = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function pageKey(domain: string, path: string): string {
  return `${domain}\0${path}`;
}

/**
 * Pure aggregation over WebHighlight rows.
 * Does not set planLabel meaningfully (left empty); callers overlay planLabel.
 */
export function aggregateLibrary(
  rows: WebHighlight[],
  opts?: { now?: number; recentCap?: number },
): WebLibraryAggregate {
  const now = opts?.now ?? Date.now();
  const recentCap = opts?.recentCap ?? DEFAULT_RECENT_CAP;
  const weekStart = now - WEEK_MS;

  const highlightCount = rows.length;

  if (highlightCount === 0) {
    return {
      domains: [],
      stats: {
        highlightCount: 0,
        pageCount: 0,
        thisWeekCount: 0,
        notesCount: 0,
        tagCount: 0,
        planLabel: '',
      },
      recent: [],
      currentPage: null,
      highlightCount: 0,
    };
  }

  // Domain → section path → count + domain lastActive
  const domainMap = new Map<
    string,
    { count: number; lastActive: number; sections: Map<string, number> }
  >();
  const pageCounts = new Map<string, number>();
  const uniqueTags = new Set<string>();
  let thisWeekCount = 0;
  let notesCount = 0;
  let latest: WebHighlight | null = null;

  for (const row of rows) {
    if (row.savedAt >= weekStart) {
      thisWeekCount += 1;
    }

    if (row.note.trim()) {
      notesCount += 1;
    }

    for (const raw of row.tags) {
      const key = raw.trim().toLowerCase();
      if (key) uniqueTags.add(key);
    }

    if (!latest || row.savedAt > latest.savedAt) {
      latest = row;
    }

    const pk = pageKey(row.domain, row.path);
    pageCounts.set(pk, (pageCounts.get(pk) ?? 0) + 1);

    let domainNode = domainMap.get(row.domain);
    if (!domainNode) {
      domainNode = { count: 0, lastActive: row.savedAt, sections: new Map() };
      domainMap.set(row.domain, domainNode);
    }
    domainNode.count += 1;
    domainNode.lastActive = Math.max(domainNode.lastActive, row.savedAt);
    domainNode.sections.set(row.path, (domainNode.sections.get(row.path) ?? 0) + 1);
  }

  const domains: WebDomainNode[] = Array.from(domainMap.entries())
    .map(([domain, data]) => ({
      domain,
      count: data.count,
      lastActive: data.lastActive,
      sections: Array.from(data.sections.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path)),
    }))
    .sort((a, b) => b.lastActive - a.lastActive || a.domain.localeCompare(b.domain));

  const recent = [...rows]
    .sort((a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, recentCap));

  let currentPage: WebCurrentPage = null;
  if (latest) {
    const key = pageKey(latest.domain, latest.path);
    currentPage = {
      domain: latest.domain,
      path: latest.path,
      sectionLabel: latest.path,
      highlightCount: pageCounts.get(key) ?? 1,
    };
  }

  return {
    domains,
    stats: {
      highlightCount,
      pageCount: pageCounts.size,
      thisWeekCount,
      notesCount,
      tagCount: uniqueTags.size,
      planLabel: '',
    },
    recent,
    currentPage,
    highlightCount,
  };
}
