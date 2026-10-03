import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  matchesDomain,
  normalizeUrl,
  PAGE_GROUP_ITEMS_SELECT_COLUMNS,
  PAGE_GROUPS_SELECT_COLUMNS,
  SupabaseGroupsAdapter,
} from '../supabase-groups-adapter.js';

describe('supabase-groups-adapter helpers', () => {
  it('defines valid select columns constants', () => {
    expect(PAGE_GROUPS_SELECT_COLUMNS).toContain('id');
    expect(PAGE_GROUPS_SELECT_COLUMNS).toContain('name');
    expect(PAGE_GROUPS_SELECT_COLUMNS).toContain('color');
    expect(PAGE_GROUP_ITEMS_SELECT_COLUMNS).toContain('id');
    expect(PAGE_GROUP_ITEMS_SELECT_COLUMNS).toContain('group_id');
    expect(PAGE_GROUP_ITEMS_SELECT_COLUMNS).toContain('kind');
  });

  it('normalizeUrl removes hash and normalizes URL', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    expect(normalizeUrl('invalid-url')).toBe('invalid-url');
  });

  it('matchesDomain matches exact host and subdomains correctly', () => {
    expect(matchesDomain('https://github.com/org/repo', 'github.com', false)).toBe(true);
    expect(matchesDomain('https://www.github.com/org/repo', 'github.com', false)).toBe(true);
    expect(matchesDomain('https://docs.github.com/api', 'github.com', false)).toBe(false);
    expect(matchesDomain('https://docs.github.com/api', 'github.com', true)).toBe(true);
    expect(matchesDomain('https://notgithub.com/api', 'github.com', true)).toBe(false);
    expect(matchesDomain('file:///path/to/file', 'github.com', true)).toBe(false);
  });
});

describe('SupabaseGroupsAdapter', () => {
  const mockFrom = vi.fn();
  const mockClient = { from: mockFrom } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listGroups', () => {
    it('returns empty array when user has no groups', async () => {
      const groupsChain: Record<string, any> = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom.mockReturnValue(groupsChain);

      const adapter = new SupabaseGroupsAdapter(mockClient);
      const res = await adapter.listGroups();

      expect(mockFrom).toHaveBeenCalledWith('page_groups');
      expect(groupsChain.select).toHaveBeenCalledWith(PAGE_GROUPS_SELECT_COLUMNS);
      expect(groupsChain.is).toHaveBeenCalledWith('deleted_at', null);
      expect(res).toEqual({ groups: [] });
    });

    it('returns groups with itemCount and correct states', async () => {
      const mockGroups = [
        {
          id: 'grp-1',
          name: 'Project Alpha',
          color: 'blue',
          position: 'a0',
          bound_device_id: 'device-123',
          bound_device_label: 'MacBook',
          bound_browser: 'chrome',
          bound_at: '2026-09-29T10:00:00Z',
          created_at: '2026-09-29T09:00:00Z',
          updated_at: '2026-09-29T10:00:00Z',
        },
        {
          id: 'grp-2',
          name: 'Research',
          color: 'green',
          position: 'a1',
          bound_device_id: null,
          bound_device_label: null,
          bound_browser: null,
          bound_at: '2026-09-29T08:00:00Z',
          created_at: '2026-09-29T07:00:00Z',
          updated_at: '2026-09-29T08:00:00Z',
        },
        {
          id: 'grp-3',
          name: 'Manual Group',
          color: 'purple',
          position: 'a2',
          bound_device_id: null,
          bound_device_label: null,
          bound_browser: null,
          bound_at: null,
          created_at: '2026-09-29T06:00:00Z',
          updated_at: '2026-09-29T06:00:00Z',
        },
      ];

      const mockItems = [
        { id: 'item-1', group_id: 'grp-1' },
        { id: 'item-2', group_id: 'grp-1' },
        { id: 'item-3', group_id: 'grp-2' },
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'page_groups') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockGroups, error: null }),
          };
        }
        if (table === 'page_group_items') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          };
        }
        return {};
      });

      const adapter = new SupabaseGroupsAdapter(mockClient);
      const res = await adapter.listGroups();

      expect(res.groups).toHaveLength(3);
      expect(res.groups[0]).toEqual({
        id: 'grp-1',
        name: 'Project Alpha',
        color: 'blue',
        itemCount: 2,
        state: 'live',
        boundDeviceId: 'device-123',
        boundDeviceLabel: 'MacBook',
        boundBrowser: 'chrome',
        boundAt: '2026-09-29T10:00:00Z',
        createdAt: '2026-09-29T09:00:00Z',
        updatedAt: '2026-09-29T10:00:00Z',
      });
      expect(res.groups[1]).toEqual({
        id: 'grp-2',
        name: 'Research',
        color: 'green',
        itemCount: 1,
        state: 'closed',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: '2026-09-29T08:00:00Z',
        createdAt: '2026-09-29T07:00:00Z',
        updatedAt: '2026-09-29T08:00:00Z',
      });
      expect(res.groups[2]).toEqual({
        id: 'grp-3',
        name: 'Manual Group',
        color: 'purple',
        itemCount: 0,
        state: 'manual',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: null,
        createdAt: '2026-09-29T06:00:00Z',
        updatedAt: '2026-09-29T06:00:00Z',
      });
    });

    it('throws SUPABASE_ERROR when Supabase query fails', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'relation does not exist' } }),
      });

      const adapter = new SupabaseGroupsAdapter(mockClient);
      await expect(adapter.listGroups()).rejects.toThrow('Failed to list groups: relation does not exist');
    });
  });

  describe('getGroup', () => {
    it('throws INVALID_ARGUMENT when id is missing or non-string', async () => {
      const adapter = new SupabaseGroupsAdapter(mockClient);
      await expect(adapter.getGroup({}, vi.fn())).rejects.toThrow('Missing required group id');
      await expect(adapter.getGroup({ id: 123 }, vi.fn())).rejects.toThrow('Missing required group id');
    });

    it('returns { group: null } when group does not exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const adapter = new SupabaseGroupsAdapter(mockClient);
      const res = await adapter.getGroup({ id: 'non-existent' }, vi.fn());

      expect(res).toEqual({ group: null });
    });

    it('returns group details with items, resolved pages, and highlight counts', async () => {
      const mockGroup = {
        id: 'grp-1',
        name: 'TypeScript Deep Dive',
        color: 'blue',
        position: 'a0',
        bound_device_id: 'mac-1',
        bound_device_label: 'MacBook Air',
        bound_browser: 'chrome',
        bound_at: '2026-09-29T10:00:00Z',
        created_at: '2026-09-29T09:00:00Z',
        updated_at: '2026-09-29T10:00:00Z',
      };

      const mockItems = [
        {
          id: 'item-1',
          group_id: 'grp-1',
          kind: 'page',
          url_normalized: 'https://typescriptlang.org/docs/handbook',
          hostname: null,
          include_subdomains: false,
          title: 'TypeScript Handbook',
          favicon_url: 'https://typescriptlang.org/favicon.ico',
          position: 'a0',
          created_at: '2026-09-29T09:05:00Z',
          updated_at: '2026-09-29T09:05:00Z',
        },
        {
          id: 'item-2',
          group_id: 'grp-1',
          kind: 'domain',
          url_normalized: null,
          hostname: 'github.com',
          include_subdomains: true,
          title: null,
          favicon_url: null,
          position: 'a1',
          created_at: '2026-09-29T09:10:00Z',
          updated_at: '2026-09-29T09:10:00Z',
        },
      ];

      const mockHighlights = [
        { id: 'hl-1', url: 'https://typescriptlang.org/docs/handbook', domain: 'typescriptlang.org' },
        { id: 'hl-2', url: 'https://typescriptlang.org/docs/handbook', domain: 'typescriptlang.org' },
        { id: 'hl-3', url: 'https://github.com/microsoft/TypeScript', domain: 'github.com' },
        { id: 'hl-4', url: 'https://docs.github.com/actions', domain: 'docs.github.com' },
        { id: 'hl-5', url: 'https://unrelated.com/blog', domain: 'unrelated.com' },
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'page_groups') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockGroup, error: null }),
          };
        }
        if (table === 'page_group_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          };
        }
        return {};
      });

      const adapter = new SupabaseGroupsAdapter(mockClient);
      const res = await adapter.getGroup({ id: 'grp-1' }, async () => mockHighlights);

      expect(res.group).not.toBeNull();
      const g = res.group!;
      expect(g.id).toBe('grp-1');
      expect(g.name).toBe('TypeScript Deep Dive');
      expect(g.color).toBe('blue');
      expect(g.state).toBe('live');
      expect(g.itemCount).toBe(2);

      // Enriched items
      expect(g.items[0]).toEqual({
        id: 'item-1',
        kind: 'page',
        url: 'https://typescriptlang.org/docs/handbook',
        title: 'TypeScript Handbook',
        faviconUrl: 'https://typescriptlang.org/favicon.ico',
        position: 'a0',
        highlightCount: 2,
        createdAt: '2026-09-29T09:05:00Z',
        updatedAt: '2026-09-29T09:05:00Z',
      });
      expect(g.items[1]).toEqual({
        id: 'item-2',
        kind: 'domain',
        hostname: 'github.com',
        includeSubdomains: true,
        position: 'a1',
        highlightCount: 2, // hl-3 (github.com) + hl-4 (docs.github.com)
        createdAt: '2026-09-29T09:10:00Z',
        updatedAt: '2026-09-29T09:10:00Z',
      });

      // Resolved pages
      expect(g.resolvedPages).toHaveLength(3);
      expect(g.resolvedPages[0]).toEqual({
        url: 'https://typescriptlang.org/docs/handbook',
        title: 'TypeScript Handbook',
        faviconUrl: 'https://typescriptlang.org/favicon.ico',
        source: 'explicit',
        highlightCount: 2,
      });
      expect(g.resolvedPages[1]).toEqual({
        url: 'https://github.com/microsoft/TypeScript',
        title: 'github.com',
        faviconUrl: null,
        source: 'via:github.com',
        highlightCount: 1,
      });
      expect(g.resolvedPages[2]).toEqual({
        url: 'https://docs.github.com/actions',
        title: 'docs.github.com',
        faviconUrl: null,
        source: 'via:github.com',
        highlightCount: 1,
      });

      expect(g.totalHighlights).toBe(4);
    });
  });
});
