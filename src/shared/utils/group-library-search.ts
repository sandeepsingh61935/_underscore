/**
 * @file group-library-search.ts
 * @description Hierarchical grouping for library search results so Library /
 * Domain / Section levels stay granular instead of one flat highlight dump.
 */

import { getSectionKey } from '@/shared/utils/section-key';

export interface SearchResultLocation {
  id: string;
  domain: string;
  url: string;
  path: string;
}

export interface SectionMatchGroup<T extends SearchResultLocation> {
  sectionKey: string;
  highlights: T[];
  /** Section path/title matched the query (even with zero highlight hits). */
  nameMatched: boolean;
  matchCount: number;
}

export interface DomainMatchGroup<T extends SearchResultLocation> {
  domain: string;
  sections: SectionMatchGroup<T>[];
  highlights: T[];
  /** Domain hostname matched the query (even with zero highlight hits). */
  nameMatched: boolean;
  matchCount: number;
}

function includesQuery(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query);
}

/** Domains whose hostname contains the query (case-insensitive). */
export function matchDomainNames(domains: readonly string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return domains.filter((d) => includesQuery(d, q));
}

/**
 * Section keys whose path or display title contains the query.
 * `titleFor` optional — when omitted, only the raw section key is matched.
 */
export function matchSectionNames(
  sections: readonly string[],
  query: string,
  titleFor?: (sectionKey: string) => string
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return sections.filter((key) => {
    if (includesQuery(key, q)) return true;
    if (titleFor && includesQuery(titleFor(key), q)) return true;
    return false;
  });
}

/**
 * Group highlight hits by domain, then by section key within each domain.
 * Domains/sections with only a name match (no highlight hits) can be merged in
 * by callers via `nameMatchedDomains` / per-domain name-matched sections.
 */
export function groupSearchResultsByDomainAndSection<T extends SearchResultLocation>(
  results: readonly T[],
  options?: {
    nameMatchedDomains?: readonly string[];
    /** section keys that matched by name, scoped under a single domain. */
    nameMatchedSections?: readonly string[];
    /** When grouping library-wide name-matched sections (rare); prefer domain-level. */
  }
): DomainMatchGroup<T>[] {
  const byDomain = new Map<string, T[]>();

  for (const r of results) {
    const list = byDomain.get(r.domain);
    if (list) list.push(r);
    else byDomain.set(r.domain, [r]);
  }

  for (const domain of options?.nameMatchedDomains ?? []) {
    if (!byDomain.has(domain)) {
      byDomain.set(domain, []);
    }
  }

  const groups: DomainMatchGroup<T>[] = [];

  for (const [domain, highlights] of byDomain) {
    const nameMatched = (options?.nameMatchedDomains ?? []).some(
      (d) => d.toLowerCase() === domain.toLowerCase()
    );

    const bySection = new Map<string, T[]>();
    for (const h of highlights) {
      const key = getSectionKey({ url: h.url, path: h.path });
      const list = bySection.get(key);
      if (list) list.push(h);
      else bySection.set(key, [h]);
    }

    // Name-matched sections only apply when building a single-domain group.
    if (options?.nameMatchedSections) {
      for (const key of options.nameMatchedSections) {
        if (!bySection.has(key)) {
          bySection.set(key, []);
        }
      }
    }

    const sections: SectionMatchGroup<T>[] = Array.from(bySection.entries()).map(
      ([sectionKey, sectionHighlights]) => {
        const sectionNameMatched = (options?.nameMatchedSections ?? []).includes(
          sectionKey
        );
        return {
          sectionKey,
          highlights: sectionHighlights,
          nameMatched: sectionNameMatched,
          matchCount: sectionHighlights.length,
        };
      }
    );

    sections.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.sectionKey.localeCompare(b.sectionKey);
    });

    groups.push({
      domain,
      sections,
      highlights,
      nameMatched,
      matchCount: highlights.length,
    });
  }

  groups.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    if (a.nameMatched !== b.nameMatched) return a.nameMatched ? -1 : 1;
    return a.domain.localeCompare(b.domain);
  });

  return groups;
}

/**
 * Group highlight hits by section within one domain (DomainDetailsView).
 */
export function groupSearchResultsBySection<T extends SearchResultLocation>(
  results: readonly T[],
  options?: {
    nameMatchedSections?: readonly string[];
  }
): SectionMatchGroup<T>[] {
  const domainGroups = groupSearchResultsByDomainAndSection(results, {
    nameMatchedSections: options?.nameMatchedSections,
  });

  // Flatten sections across domains (caller scopes results to one domain).
  const sections: SectionMatchGroup<T>[] = [];
  for (const g of domainGroups) {
    sections.push(...g.sections);
  }

  sections.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.sectionKey.localeCompare(b.sectionKey);
  });

  return sections;
}

/** Result count for the search bar: highlight hits + pure name matches with zero hits. */
export function countGranularSearchResults(
  domainGroups: readonly DomainMatchGroup<SearchResultLocation>[]
): number {
  let n = 0;
  for (const g of domainGroups) {
    n += g.matchCount;
    if (g.nameMatched && g.matchCount === 0) n += 1;
    for (const s of g.sections) {
      if (s.nameMatched && s.matchCount === 0) n += 1;
    }
  }
  return n;
}

export function countSectionGranularResults(
  sections: readonly SectionMatchGroup<SearchResultLocation>[]
): number {
  let n = 0;
  for (const s of sections) {
    n += s.matchCount;
    if (s.nameMatched && s.matchCount === 0) n += 1;
  }
  return n;
}
