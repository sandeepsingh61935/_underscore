/**
 * @file highlight-query-service.ts
 * @description Read-side aggregations over highlight data.
 *
 * Per ADR-006 + ADR-010, the RepositoryFacade is a write/cache seam only.
 * Domain aggregations (collections grouped by hostname, weekly counts,
 * etc.) live here. The service holds an IReadableHighlightRepository
 * and computes aggregates in memory.
 *
 * The service is constructed per-context (background, web) so it can
 * point at the right storage. In the background it composes with the
 * RepositoryFacade (sync cache); in the web app it can compose directly
 * with the Supabase repository.
 */

import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';

export interface CollectionSummary {
  domain: string;
  highlightCount: number;
  mode: string;
}

export interface DomainHighlightSummary {
  id: string;
  text: string;
  url: string;
  path: string;
  createdAt: Date;
}

export interface DashboardData {
  totalHighlights: number;
  totalDomains: number;
  thisWeekCount: number;
  recentHighlights: DomainHighlightSummary[];
}

/**
 * HighlightQueryService — read-side aggregations over highlight data.
 *
 * Pure: each method takes the (optionally mode-tagged) input, iterates
 * the readable repository's data, and returns derived shape. No
 * mutations. Safe to call repeatedly; results are not cached at this
 * layer (callers can cache if needed).
 */
export class HighlightQueryService {
  constructor(private readonly readable: IReadableHighlightRepository) {}

  async getCollections(mode?: string): Promise<CollectionSummary[]> {
    const highlights = await this.readable.findAll();
    const domainMap = new Map<string, number>();

    for (const hl of highlights) {
      if (!hl.url) continue;
      try {
        const domain = new URL(hl.url).hostname;
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      } catch {
        continue;
      }
    }

    return Array.from(domainMap.entries()).map(([domain, highlightCount]) => ({
      domain,
      highlightCount,
      mode: mode ?? 'local',
    }));
  }

  async getHighlightsByDomain(domain: string): Promise<DomainHighlightSummary[]> {
    if (!domain) {
      throw new Error('Domain required');
    }

    const highlights = await this.readable.findAll();
    return highlights
      .filter((hl) => {
        if (!hl.url) return false;
        try {
          return new URL(hl.url).hostname === domain;
        } catch {
          return false;
        }
      })
      .map((hl) => ({
        id: hl.id,
        text: hl.text,
        url: hl.url ?? '',
        path: hl.url ? new URL(hl.url).pathname : '/',
        createdAt: hl.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDashboardData(_mode?: string): Promise<DashboardData> {
    const highlights = await this.readable.findAll();

    const domainMap = new Map<string, number>();
    let thisWeekCount = 0;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentHighlights: DomainHighlightSummary[] = [];

    for (const hl of highlights) {
      if (!hl.url) continue;
      try {
        const domain = new URL(hl.url).hostname;
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);

        const createdAt = new Date(hl.createdAt).getTime();
        if (createdAt >= oneWeekAgo) {
          thisWeekCount++;
        }

        recentHighlights.push({
          id: hl.id,
          text: hl.text,
          url: hl.url ?? '',
          path: new URL(hl.url).pathname,
          domain,
          createdAt: hl.createdAt,
        });
      } catch {
        continue;
      }
    }

    recentHighlights.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      totalHighlights: highlights.length,
      totalDomains: domainMap.size,
      thisWeekCount,
      recentHighlights: recentHighlights.slice(0, 10),
    };
  }
}
