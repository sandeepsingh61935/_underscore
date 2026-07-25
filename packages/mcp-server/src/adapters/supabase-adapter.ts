import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { McpAdapter } from './types.js';
import { displayTextFromCloudRow, HIGHLIGHTS_SELECT_COLUMNS, notesAndTagsFromCloudRow } from './cloud-highlight-text.js';

export interface SupabaseAdapterConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
}

function rowToSummary(row: Record<string, unknown>): {
  id: string;
  text: string;
  url: string;
  path: string;
  domain: string;
  createdAt: string;
  notes?: string;
  tags?: string[];
} {
  const url = String(row.url ?? '');
  let domain = '';
  let path = '/';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, '');
    path = parsed.pathname || '/';
  } catch {
    domain = '';
  }
  const { notes, tags } = notesAndTagsFromCloudRow(row);
  return {
    id: String(row.id),
    text: displayTextFromCloudRow(row.text),
    url,
    path,
    domain,
    createdAt: String(row.created_at ?? row.updated_at ?? new Date().toISOString()),
    notes,
    tags,
  };
}

export class SupabaseMcpAdapter implements McpAdapter {
  readonly name = 'cloud' as const;
  readonly dataCoverage = 'pro_cloud' as const;
  private readonly client: SupabaseClient;

  constructor(config: SupabaseAdapterConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${config.accessToken}` } },
    });
  }

  isReady(): boolean {
    return true;
  }

  async dispatch(method: string, payload?: unknown): Promise<unknown> {
    switch (method) {
      case 'get_session':
        return this.getSession();
      case 'list_collections':
        return this.listCollections();
      case 'get_highlights':
        return this.getHighlights(payload);
      case 'search_highlights':
        return this.searchHighlights(payload);
      case 'fetch_highlight':
        return this.fetchHighlight(payload);
      case 'export_highlights':
        return this.exportHighlights(payload);
      default:
        throw Object.assign(new Error(`Cloud adapter does not support method: ${method}`), {
          code: 'NOT_SUPPORTED',
        });
    }
  }

  private async fetchHighlights(): Promise<ReturnType<typeof rowToSummary>[]> {
    const { data, error } = await this.client
      .from('highlights')
      .select(HIGHLIGHTS_SELECT_COLUMNS)
      .is('deleted_at', null);

    if (error) {
      throw Object.assign(new Error(error.message), { code: 'SUPABASE_ERROR' });
    }

    return (data ?? []).map((row) => rowToSummary(row as Record<string, unknown>));
  }

  async getSession(): Promise<unknown> {
    const { data: userData, error } = await this.client.auth.getUser();
    if (error) {
      throw Object.assign(new Error(error.message), { code: 'AUTH_ERROR' });
    }
    return {
      mode: 'pro',
      displayName: 'Pro',
      storageScope: 'pro',
      auth: {
        signedIn: Boolean(userData.user),
        userId: userData.user?.id,
        email: userData.user?.email,
      },
      capabilities: {
        sync: false,
        export: true,
        ai: false,
        collections: true,
        search: true,
        metadataWrite: false,
      },
      vault: { locked: true },
      dataCoverage: 'pro_cloud',
      bridgeConnected: false,
    };
  }

  async listCollections(): Promise<unknown> {
    const highlights = await this.fetchHighlights();
    const domainMap = new Map<string, number>();
    for (const hl of highlights) {
      if (!hl.domain) continue;
      domainMap.set(hl.domain, (domainMap.get(hl.domain) ?? 0) + 1);
    }
    return {
      collections: [...domainMap.entries()].map(([domain, highlightCount]) => ({
        domain,
        highlightCount,
        mode: 'pro',
      })),
      dataCoverage: 'pro_cloud',
      storageScope: 'pro',
    };
  }

  async getHighlights(payload: unknown): Promise<unknown> {
    const input = payload as { domain?: string; limit?: number; cursor?: string };
    if (!input?.domain) {
      throw Object.assign(new Error('domain is required'), { code: 'INVALID_ARGUMENT' });
    }
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;

    const all = (await this.fetchHighlights()).filter((hl) => hl.domain === input.domain);
    const page = all.slice(offset, offset + limit);
    const nextOffset = offset + limit;

    return {
      highlights: page,
      nextCursor: nextOffset < all.length ? String(nextOffset) : undefined,
      total: all.length,
      dataCoverage: 'pro_cloud',
      storageScope: 'pro',
    };
  }

  async searchHighlights(payload: unknown): Promise<unknown> {
    const input = payload as { query?: string; domain?: string; limit?: number; cursor?: string };
    const query = input?.query?.trim().toLowerCase();
    if (!query) {
      throw Object.assign(new Error('query is required'), { code: 'INVALID_ARGUMENT' });
    }
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;

    let all = await this.fetchHighlights();
    if (input.domain) {
      all = all.filter((hl) => hl.domain === input.domain);
    }
    // Matching logic mirrors src/shared/utils/highlight-search.ts (searchHighlights) --
    // this package builds standalone (own tsconfig/rootDir, NodeNext resolution, no
    // cross-package imports elsewhere in this file), so it cannot import directly from
    // the main src/shared tree. Keep this in sync if the shared util's semantics change.
    const matches = all.filter((hl) => {
      const haystack = [hl.text, hl.notes, ...(hl.tags ?? []), hl.url].join(' ').toLowerCase();
      return haystack.includes(query);
    });

    return {
      highlights: matches.slice(offset, offset + limit),
      nextCursor: offset + limit < matches.length ? String(offset + limit) : undefined,
      total: matches.length,
      dataCoverage: 'pro_cloud',
    };
  }

  async fetchHighlight(payload: unknown): Promise<unknown> {
    const input = payload as { id?: string };
    if (!input?.id?.trim()) {
      throw Object.assign(new Error('id is required'), { code: 'INVALID_ARGUMENT' });
    }

    const { data, error } = await this.client
      .from('highlights')
      .select(HIGHLIGHTS_SELECT_COLUMNS)
      .eq('id', input.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw Object.assign(new Error(error.message), { code: 'SUPABASE_ERROR' });
    }
    if (!data) {
      throw Object.assign(new Error(`Highlight not found: ${input.id}`), { code: 'NOT_FOUND' });
    }

    return rowToSummary(data as Record<string, unknown>);
  }

  async exportHighlights(payload: unknown): Promise<unknown> {
    // register-tools.ts dispatches `{ scope: { kind, domain } }` (matching the
    // bridge adapter's shape); also accept a flat `{ domain }` for direct callers.
    const input = payload as { domain?: string; scope?: { kind?: string; domain?: string } };
    const domain = input?.scope?.domain || input?.domain;

    let highlights = await this.fetchHighlights();
    if (domain) {
      highlights = highlights.filter((hl) => hl.domain === domain);
    }
    const markdown = highlights
      .map((hl, i) => `### ${i + 1}. ${hl.url}\n\n> ${hl.text}\n`)
      .join('\n');

    return {
      format: 'md',
      markdown,
      filename: domain ? `underscore-${domain}.md` : 'underscore-library.md',
      stats: { included: highlights.length, omitted: 0, domains: new Set(highlights.map((h) => h.domain)).size },
      dataCoverage: 'pro_cloud',
    };
  }
}
