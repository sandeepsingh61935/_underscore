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

import type { ExportScope } from '@/shared/highlight-export';
import { filterRawHighlightsByScope } from '@/shared/highlight-export';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { getDomainFromUrl, urlMatchesDomain } from '@/shared/utils/domain-from-url';
import { getSectionKey } from '@/shared/utils/section-key';
import type { SearchField } from '@/shared/utils/highlight-search';
import { searchHighlights } from '@/shared/utils/highlight-search';
import {
  compareByHighlightActivityDesc,
  highlightActivityMs,
} from '@/shared/utils/highlight-activity';
import type { ITagLabelResolver } from '@/shared/services/i-tag-label-resolver';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';

export interface CollectionSummary {
  domain: string;
  highlightCount: number;
  mode: string;
  /** ISO or Date of most recent highlight activity in this domain */
  lastActive?: Date;
}

export interface DomainHighlightSummary {
  id: string;
  text: string;
  url: string;
  path: string;
  domain: string;
  createdAt: Date;
  updatedAt?: Date;
  notes?: string;
  tags?: string[];
  /** Present when highlight was captured from a page code block. */
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation;
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
  constructor(
    private readonly readable: IReadableHighlightRepository,
    private readonly tagResolver?: ITagLabelResolver,
  ) {}

  private async resolveTags(
    summaries: DomainHighlightSummary[],
  ): Promise<DomainHighlightSummary[]> {
    if (!this.tagResolver || summaries.length === 0) {
      return summaries;
    }

    const labelMap = await this.tagResolver.getLabelsForHighlights(summaries.map((s) => s.id));
    return summaries.map((summary) => ({
      ...summary,
      tags: this.tagResolver!.mergeWithMetadataFallback(labelMap.get(summary.id), summary.tags),
    }));
  }

  async getCollections(mode?: string): Promise<CollectionSummary[]> {
    const highlights = await this.readable.findAll();
    const domainMap = new Map<string, { count: number; lastActive: number }>();

    for (const hl of highlights) {
      if (!hl.url) continue;
      const domain = getDomainFromUrl(hl.url);
      if (!domain) continue;
      const activity = highlightActivityMs(hl);
      const prev = domainMap.get(domain);
      if (!prev) {
        domainMap.set(domain, { count: 1, lastActive: activity });
      } else {
        domainMap.set(domain, {
          count: prev.count + 1,
          lastActive: Math.max(prev.lastActive, activity),
        });
      }
    }

    return Array.from(domainMap.entries())
      .map(([domain, { count, lastActive }]) => ({
        domain,
        highlightCount: count,
        mode: mode ?? 'basic',
        lastActive: new Date(lastActive),
      }))
      .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  }

  async getHighlightsByDomain(domain: string): Promise<DomainHighlightSummary[]> {
    if (!domain) {
      throw new Error('Domain required');
    }

    const highlights = await this.readable.findAll();
    const mapped = highlights
      .filter((hl) => hl.url && urlMatchesDomain(hl.url, domain))
      .map((hl) => ({
        id: hl.id,
        text: hl.text,
        url: hl.url ?? '',
        path: hl.url ? new URL(hl.url).pathname : '/',
        domain,
        createdAt: hl.createdAt,
        updatedAt: hl.updatedAt,
        notes: hl.metadata?.notes,
        tags: hl.metadata?.tags,
        sourceKind: hl.metadata?.sourceKind,
        language: hl.metadata?.language,
        presentation: hl.metadata?.presentation,
      }))
      .sort(compareByHighlightActivityDesc);
    return this.resolveTags(mapped);
  }

  /**
   * Case-insensitive substring search over highlight summaries, optionally
   * scoped to a domain (and, within that domain, a section). Delegates the
   * actual matching to the shared `searchHighlights` util so semantics stay
   * identical across the extension, web, and MCP surfaces.
   *
   * `options.section` only makes sense combined with `options.domain` (a
   * section key is only unique within a domain) but is not validated here —
   * callers are expected to pass a matching domain, per the plan contract.
   */
  async search(
    query: string,
    options?: { domain?: string; section?: string; fields?: SearchField[] }
  ): Promise<Array<DomainHighlightSummary & { matchedFields: SearchField[] }>> {
    if (!query || !query.trim()) {
      return [];
    }

    const highlights = await this.readable.findAll();

    const scoped = options?.domain
      ? highlights.filter((hl) => hl.url && urlMatchesDomain(hl.url, options.domain!))
      : highlights.filter((hl) => !!hl.url);

    const mapped: DomainHighlightSummary[] = [];
    for (const hl of scoped) {
      const url = hl.url;
      if (!url) continue;

      const domain = options?.domain ?? getDomainFromUrl(url);
      if (!domain) continue;

      let path: string;
      try {
        path = new URL(url).pathname;
      } catch {
        continue;
      }

      if (options?.section && getSectionKey({ url, path }) !== options.section) {
        continue;
      }

      mapped.push({
        id: hl.id,
        text: hl.text,
        url,
        path,
        domain,
        createdAt: hl.createdAt,
        updatedAt: hl.updatedAt,
        notes: hl.metadata?.notes,
        tags: hl.metadata?.tags,
        sourceKind: hl.metadata?.sourceKind,
        language: hl.metadata?.language,
        presentation: hl.metadata?.presentation,
      });
    }

    const matches = searchHighlights(mapped, query, options?.fields);
    const enriched = await this.resolveTags(matches.map((m) => m.highlight));
    const enrichedById = new Map(enriched.map((summary) => [summary.id, summary]));
    return matches.map((m) => ({
      ...(enrichedById.get(m.highlight.id) ?? m.highlight),
      matchedFields: m.matchedFields,
    }));
  }

  async findAllForExport(scope: ExportScope): Promise<HighlightDataV2[]> {
    const highlights = await this.readable.findAll();
    return filterRawHighlightsByScope(highlights, scope);
  }

  async getDashboardData(_mode?: string): Promise<DashboardData> {
    const highlights = await this.readable.findAll();

    const domainMap = new Map<string, number>();
    let thisWeekCount = 0;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentHighlights: DomainHighlightSummary[] = [];

    for (const hl of highlights) {
      if (!hl.url) continue;
      const domain = getDomainFromUrl(hl.url);
      if (!domain) continue;

      domainMap.set(domain, (domainMap.get(domain) || 0) + 1);

      if (highlightActivityMs(hl) >= oneWeekAgo) {
        thisWeekCount++;
      }

      try {
        recentHighlights.push({
          id: hl.id,
          text: hl.text,
          url: hl.url ?? '',
          path: new URL(hl.url).pathname,
          domain,
          createdAt: hl.createdAt,
          updatedAt: hl.updatedAt,
          sourceKind: hl.metadata?.sourceKind,
          language: hl.metadata?.language,
          presentation: hl.metadata?.presentation,
        });
      } catch {
        continue;
      }
    }

    recentHighlights.sort(compareByHighlightActivityDesc);

    return {
      totalHighlights: highlights.length,
      totalDomains: domainMap.size,
      thisWeekCount,
      recentHighlights: recentHighlights.slice(0, 10),
    };
  }
}
