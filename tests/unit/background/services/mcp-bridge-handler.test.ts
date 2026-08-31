import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  McpBridgeHandler,
  type McpBridgeHandlerDeps,
} from '@/background/services/mcp-bridge-handler';
import type { HighlightQueryService } from '@/shared/services/highlight-query-service';

function createHandler(overrides: Partial<McpBridgeHandlerDeps> = {}): McpBridgeHandler {
  const highlightQueryService = {
    getCollections: vi
      .fn()
      .mockResolvedValue([{ domain: 'example.com', highlightCount: 2, mode: 'basic' }]),
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
    repositoryFacade: {
      update: vi.fn(),
      get: vi.fn(),
    } as unknown as McpBridgeHandlerDeps['repositoryFacade'],
    tagService: {
      setHighlightLabels: vi.fn().mockResolvedValue(undefined),
      listByUser: vi.fn().mockResolvedValue([]),
      getLabelsForHighlights: vi.fn().mockResolvedValue(new Map()),
      mergeWithMetadataFallback: vi.fn(),
    } as unknown as McpBridgeHandlerDeps['tagService'],
    cloudHydrationService: {
      hydrate: vi.fn(),
    } as unknown as McpBridgeHandlerDeps['cloudHydrationService'],
    librarySyncCursor: {
      get: vi.fn().mockResolvedValue(null),
      clear: vi.fn(),
      set: vi.fn(),
    } as unknown as McpBridgeHandlerDeps['librarySyncCursor'],
    getActiveMode: vi.fn().mockResolvedValue('basic'),
    getIsPaidActive: async () => false,
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
    const session = (await handler.getSession()) as {
      dataCoverage: string;
      mode: string;
    };
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
      handler.askScope({ domain: 'example.com', sectionKey: '/', question: 'test' })
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

  it('get_session enables library MCP flags for signed-in free during free window (ai off)', async () => {
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
      getIsPaidActive: async () => false,
    });
    const session = (await handler.getSession()) as {
      capabilities: { export: boolean; sync: boolean; ai: boolean };
    };
    expect(session.capabilities.export).toBe(true);
    expect(session.capabilities.sync).toBe(true);
    expect(session.capabilities.ai).toBe(false);
  });

  it('get_session never enables in-app ai (Ask retired); MCP library ops stay on when paid', async () => {
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
      capabilities: { ai: boolean; sync: boolean };
    };
    expect(session.capabilities.ai).toBe(false);
    expect(session.capabilities.sync).toBe(true);
  });

  it('ask_scope is denied (in-app Ask product retired)', async () => {
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

    await expect(
      handler.askScope({
        domain: 'example.com',
        sectionKey: '/',
        question: 'What is this about?',
      })
    ).rejects.toThrow(/Paid|Account/i);
  });

  it('enforceBridgeEligibility keeps bridge enabled for signed-in free during free window', async () => {
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
      getIsPaidActive: async () => false,
    });

    await expect(handler.enforceBridgeEligibility()).resolves.toBe(true);
    expect(set).not.toHaveBeenCalledWith({ [MCP_BRIDGE_STORAGE_KEYS.enabled]: false });
  });
});
