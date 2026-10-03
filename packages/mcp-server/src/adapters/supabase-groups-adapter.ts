import type { SupabaseClient } from '@supabase/supabase-js';

export const PAGE_GROUPS_SELECT_COLUMNS =
  'id, name, color, position, bound_device_id, bound_device_label, bound_browser, bound_at, created_at, updated_at';

export const PAGE_GROUP_ITEMS_SELECT_COLUMNS =
  'id, group_id, kind, url_normalized, hostname, include_subdomains, title, favicon_url, position, created_at, updated_at';

export interface GroupSummary {
  id: string;
  name: string;
  color: string;
  itemCount: number;
  state: 'live' | 'closed' | 'manual';
  boundDeviceId?: string | null;
  boundDeviceLabel?: string | null;
  boundBrowser?: string | null;
  boundAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedGroupItem {
  id: string;
  kind: 'page' | 'domain';
  url?: string | null;
  hostname?: string | null;
  includeSubdomains?: boolean;
  title?: string | null;
  faviconUrl?: string | null;
  position: string;
  highlightCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedGroupPage {
  url: string;
  title: string | null;
  faviconUrl: string | null;
  source: string;
  highlightCount: number;
}

export interface GroupDetails {
  id: string;
  name: string;
  color: string;
  state: 'live' | 'closed' | 'manual';
  boundDeviceId?: string | null;
  boundDeviceLabel?: string | null;
  boundBrowser?: string | null;
  boundAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: EnrichedGroupItem[];
  resolvedPages: ResolvedGroupPage[];
  itemCount: number;
  totalHighlights: number;
}

export function matchesDomain(url: string, hostname: string, includeSubdomains: boolean): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const targetHost = hostname.toLowerCase().trim().replace(/^www\./, '').replace(/\.+$/, '');
    if (!host || !targetHost) return false;
    if (host === targetHost) return true;
    if (includeSubdomains && host.endsWith(`.${targetHost}`)) return true;
    return false;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

export class SupabaseGroupsAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async listGroups(): Promise<{ groups: GroupSummary[] }> {
    const { data: groupsData, error: groupsError } = await this.client
      .from('page_groups')
      .select(PAGE_GROUPS_SELECT_COLUMNS)
      .is('deleted_at', null)
      .order('position', { ascending: true });

    if (groupsError) {
      throw Object.assign(new Error(`Failed to list groups: ${groupsError.message}`), {
        code: 'SUPABASE_ERROR',
        details: groupsError,
      });
    }

    const groups = groupsData || [];
    if (groups.length === 0) {
      return { groups: [] };
    }

    const { data: itemsData, error: itemsError } = await this.client
      .from('page_group_items')
      .select('id, group_id')
      .is('deleted_at', null);

    if (itemsError) {
      throw Object.assign(new Error(`Failed to count group items: ${itemsError.message}`), {
        code: 'SUPABASE_ERROR',
        details: itemsError,
      });
    }

    const countMap = new Map<string, number>();
    for (const item of itemsData || []) {
      const gid = String((item as any).group_id);
      countMap.set(gid, (countMap.get(gid) ?? 0) + 1);
    }

    const result: GroupSummary[] = groups.map((g: any) => {
      const state: 'live' | 'closed' | 'manual' = g.bound_device_id
        ? 'live'
        : g.bound_at
        ? 'closed'
        : 'manual';

      return {
        id: String(g.id),
        name: String(g.name),
        color: String(g.color),
        itemCount: countMap.get(String(g.id)) ?? 0,
        state,
        boundDeviceId: g.bound_device_id ?? null,
        boundDeviceLabel: g.bound_device_label ?? null,
        boundBrowser: g.bound_browser ?? null,
        boundAt: g.bound_at ?? null,
        createdAt: String(g.created_at),
        updatedAt: String(g.updated_at),
      };
    });

    return { groups: result };
  }

  async getGroup(
    payload: unknown,
    fetchHighlights: () => Promise<Array<{ id: string; url: string; domain?: string; title?: string }>>,
  ): Promise<{ group: GroupDetails | null }> {
    const { id } = (payload as { id?: string }) || {};
    if (!id || typeof id !== 'string') {
      throw Object.assign(new Error('Missing required group id'), { code: 'INVALID_ARGUMENT' });
    }

    const { data: groupData, error: groupError } = await this.client
      .from('page_groups')
      .select(PAGE_GROUPS_SELECT_COLUMNS)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (groupError) {
      throw Object.assign(new Error(`Failed to fetch group: ${groupError.message}`), {
        code: 'SUPABASE_ERROR',
        details: groupError,
      });
    }

    if (!groupData) {
      return { group: null };
    }

    const { data: itemsData, error: itemsError } = await this.client
      .from('page_group_items')
      .select(PAGE_GROUP_ITEMS_SELECT_COLUMNS)
      .eq('group_id', id)
      .is('deleted_at', null)
      .order('position', { ascending: true });

    if (itemsError) {
      throw Object.assign(new Error(`Failed to fetch group items: ${itemsError.message}`), {
        code: 'SUPABASE_ERROR',
        details: itemsError,
      });
    }

    const items = itemsData || [];
    const highlights = await fetchHighlights();

    // Group highlights by normalized URL
    const highlightsByUrl = new Map<string, Array<{ id: string; url: string; domain?: string }>>();
    for (const hl of highlights) {
      const norm = normalizeUrl(hl.url);
      const list = highlightsByUrl.get(norm) ?? [];
      list.push(hl);
      highlightsByUrl.set(norm, list);
    }

    const resolvedPagesMap = new Map<string, ResolvedGroupPage>();
    const enrichedItems: EnrichedGroupItem[] = [];

    for (const rawItem of items) {
      const item = rawItem as any;
      const kind = item.kind as 'page' | 'domain';

      if (kind === 'page') {
        const rawUrl = String(item.url_normalized ?? '');
        const norm = normalizeUrl(rawUrl);
        const matchingHls = highlightsByUrl.get(norm) ?? [];
        const hlCount = matchingHls.length;

        if (rawUrl && !resolvedPagesMap.has(norm)) {
          resolvedPagesMap.set(norm, {
            url: rawUrl,
            title: item.title ?? null,
            faviconUrl: item.favicon_url ?? null,
            source: 'explicit',
            highlightCount: hlCount,
          });
        }

        enrichedItems.push({
          id: String(item.id),
          kind: 'page',
          url: rawUrl,
          title: item.title ?? null,
          faviconUrl: item.favicon_url ?? null,
          position: String(item.position),
          highlightCount: hlCount,
          createdAt: String(item.created_at),
          updatedAt: String(item.updated_at),
        });
      } else {
        const hostname = String(item.hostname ?? '');
        const includeSubdomains = Boolean(item.include_subdomains);

        let domainHlCount = 0;
        for (const [normUrl, hls] of highlightsByUrl.entries()) {
          if (matchesDomain(normUrl, hostname, includeSubdomains)) {
            domainHlCount += hls.length;
            if (!resolvedPagesMap.has(normUrl)) {
              resolvedPagesMap.set(normUrl, {
                url: normUrl,
                title: hls[0]?.domain ?? null,
                faviconUrl: null,
                source: `via:${hostname}`,
                highlightCount: hls.length,
              });
            }
          }
        }

        enrichedItems.push({
          id: String(item.id),
          kind: 'domain',
          hostname,
          includeSubdomains,
          position: String(item.position),
          highlightCount: domainHlCount,
          createdAt: String(item.created_at),
          updatedAt: String(item.updated_at),
        });
      }
    }

    const resolvedPages = Array.from(resolvedPagesMap.values());
    const totalHighlights = resolvedPages.reduce((acc, p) => acc + p.highlightCount, 0);

    const state: 'live' | 'closed' | 'manual' = (groupData as any).bound_device_id
      ? 'live'
      : (groupData as any).bound_at
      ? 'closed'
      : 'manual';

    return {
      group: {
        id: String((groupData as any).id),
        name: String((groupData as any).name),
        color: String((groupData as any).color),
        state,
        boundDeviceId: (groupData as any).bound_device_id ?? null,
        boundDeviceLabel: (groupData as any).bound_device_label ?? null,
        boundBrowser: (groupData as any).bound_browser ?? null,
        boundAt: (groupData as any).bound_at ?? null,
        createdAt: String((groupData as any).created_at),
        updatedAt: String((groupData as any).updated_at),
        items: enrichedItems,
        resolvedPages,
        itemCount: enrichedItems.length,
        totalHighlights,
      },
    };
  }
}
