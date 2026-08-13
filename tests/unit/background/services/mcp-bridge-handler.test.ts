import { describe, expect, it, vi, beforeEach } from 'vitest';

import { McpBridgeHandler, type McpBridgeHandlerDeps } from '@/background/services/mcp-bridge-handler';
import type { HighlightQueryService } from '@/shared/services/highlight-query-service';

function createHandler(overrides: Partial<McpBridgeHandlerDeps> = {}): McpBridgeHandler {
  const highlightQueryService = {
    getCollections: vi.fn().mockResolvedValue([{ domain: 'example.com', highlightCount: 2, mode: 'basic' }]),
    getHighlightsByDomain: vi.fn().mockResolvedValue([]),
    findAllForExport: vi.fn().mockResolvedValue([]),
    getDashboardData: vi.fn().mockResolvedValue({
      totalHighlights: 0,
      totalDomains: 0,
      thisWeekCount: 0,
      todayCount: 0,
      withNotesCount: 0,
      withTagsCount: 0,
      recentHighlights: [],
    }),
  } as unknown as HighlightQueryService;

  const deps: McpBridgeHandlerDeps = {
    authManager: {
      isAuthenticated: false,
      getAuthState: () => ({ isAuthenticated: false, user: null }),
    } as McpBridgeHandlerDeps['authManager'],
    getHighlightQueryService: () => highlightQueryService,
    backgroundHighlightOrchestrator: {
      enrichWithPlaintext: vi.fn(async (items: unknown[]) => items),
    } as unknown as McpBridgeHandlerDeps['backgroundHighlightOrchestrator'],
    scopedHighlightRepository: {
      getActiveScope: () => 'basic',
    } as unknown as McpBridgeHandlerDeps['scopedHighlightRepository'],
    repositoryFacade: { update: vi.fn(), get: vi.fn() } as unknown as McpBridgeHandlerDeps['repositoryFacade'],
    tagService: {
      setHighlightLabels: vi.fn().mockResolvedValue(undefined),
      listByUser: vi.fn().mockResolvedValue([]),
      getLabelsForHighlights: vi.fn().mockResolvedValue(new Map()),
      mergeWithMetadataFallback: vi.fn(),
    } as unknown as McpBridgeHandlerDeps['tagService'],
    cloudHydrationService: { hydrate: vi.fn() } as unknown as McpBridgeHandlerDeps['cloudHydrationService'],
    librarySyncCursor: {
      get: vi.fn().mockResolvedValue(null),
      clear: vi.fn(),
      set: vi.fn(),
    } as unknown as McpBridgeHandlerDeps['librarySyncCursor'],
    getActiveMode: vi.fn().mockResolvedValue('basic'),
    ...overrides,
  };

  return new McpBridgeHandler(deps);
}

describe('McpBridgeHandler', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });
  });

  it('get_session returns basic_local dataCoverage for guest', async () => {
    const handler = createHandler();
    const session = (await handler.getSession()) as { dataCoverage: string; mode: string };
    expect(session.dataCoverage).toBe('basic_local');
    expect(session.mode).toBe('basic');
  });

  it('list_collections returns collections', async () => {
    const handler = createHandler();
    const result = (await handler.listCollections({})) as { collections: unknown[] };
    expect(result.collections).toHaveLength(1);
  });

  it('ask_scope rejects when not entitled', async () => {
    const handler = createHandler();
    await expect(
      handler.askScope({ domain: 'example.com', sectionKey: '/', question: 'test' }),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('get_session denies export and sync for guest Basic', async () => {
    const handler = createHandler({
      getActiveMode: vi.fn().mockResolvedValue('basic'),
    });
    const session = (await handler.getSession()) as {
      capabilities: { export: boolean; sync: boolean };
    };
    expect(session.capabilities.export).toBe(false);
    expect(session.capabilities.sync).toBe(false);
  });

  it('get_session zeros MCP capabilities for signed-in Account Free (paid gate)', async () => {
    const handler = createHandler({
      authManager: {
        isAuthenticated: true,
        getAuthState: () => ({
          isAuthenticated: true,
          user: { id: 'u1', email: 'a@b.com' },
        }),
      } as McpBridgeHandlerDeps['authManager'],
      scopedHighlightRepository: {
        getActiveScope: () => 'pro',
      } as McpBridgeHandlerDeps['scopedHighlightRepository'],
      getActiveMode: vi.fn().mockResolvedValue('pro'),
    });
    const session = (await handler.getSession()) as {
      capabilities: { export: boolean; sync: boolean; ai: boolean };
    };
    expect(session.capabilities.export).toBe(false);
    expect(session.capabilities.sync).toBe(false);
    expect(session.capabilities.ai).toBe(false);
  });

  it('get_session enables ai for signed-in Account (Paid)', async () => {
    const handler = createHandler({
      authManager: {
        isAuthenticated: true,
        getAuthState: () => ({
          isAuthenticated: true,
          user: { id: 'u1', email: 'a@b.com' },
        }),
      } as McpBridgeHandlerDeps['authManager'],
      scopedHighlightRepository: {
        getActiveScope: () => 'pro',
      } as McpBridgeHandlerDeps['scopedHighlightRepository'],
      getActiveMode: vi.fn().mockResolvedValue('pro_xai'),
      getIsPaidActive: async () => true,
    });
    const session = (await handler.getSession()) as {
      capabilities: { ai: boolean };
    };
    expect(session.capabilities.ai).toBe(true);
  });

  it('ask_scope returns context_only payload on pro_xai without orchestrator', async () => {
    const handler = createHandler({
      authManager: {
        isAuthenticated: true,
        getAuthState: () => ({
          isAuthenticated: true,
          user: { id: 'u1', email: 'a@b.com' },
        }),
      } as McpBridgeHandlerDeps['authManager'],
      scopedHighlightRepository: {
        getActiveScope: () => 'pro',
      } as McpBridgeHandlerDeps['scopedHighlightRepository'],
      getActiveMode: vi.fn().mockResolvedValue('pro_xai'),
      getIsPaidActive: async () => true,
      getHighlightQueryService: () => ({
        getCollections: vi.fn(),
        getHighlightsByDomain: vi.fn().mockResolvedValue([
          { id: 'h1', text: 'quote', url: 'https://example.com/', path: '/' },
        ]),
        findAllForExport: vi.fn(),
        getDashboardData: vi.fn(),
      }) as unknown as HighlightQueryService,
    });

    const result = (await handler.askScope({
      domain: 'example.com',
      sectionKey: '/',
      question: 'What is this about?',
    })) as { mode: string };

    expect(result.mode).toBe('context_only');
  });

  it('enforceBridgeEligibility clears enabled flag when not Paid', async () => {
    const { MCP_BRIDGE_STORAGE_KEYS } = await import('@/shared/constants/mcp-bridge');
    const set = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: true,
    });

    const { browser } = await import('wxt/browser');
    vi.spyOn(browser.storage.local, 'get').mockImplementation(get as never);
    vi.spyOn(browser.storage.local, 'set').mockImplementation(set as never);

    const handler = createHandler({
      authManager: {
        isAuthenticated: true,
        getAuthState: () => ({
          isAuthenticated: true,
          user: { id: 'u1', email: 'a@b.com' },
        }),
      } as McpBridgeHandlerDeps['authManager'],
      scopedHighlightRepository: {
        getActiveScope: () => 'pro',
      } as McpBridgeHandlerDeps['scopedHighlightRepository'],
      getActiveMode: vi.fn().mockResolvedValue('pro'),
    });

    await expect(handler.enforceBridgeEligibility()).resolves.toBe(false);
    expect(set).toHaveBeenCalledWith({ [MCP_BRIDGE_STORAGE_KEYS.enabled]: false });
  });
});
