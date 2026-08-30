import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudModeService } from './cloud-mode-service';
import { MultiSelectorEngine } from './multi-selector-engine';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/interfaces/i-logger';

describe('CloudModeService.restoreHighlightsForUrl', () => {
  let service: CloudModeService;
  let getAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAll = vi.fn(() => []);
    const facade = {
      getAll,
    } as unknown as RepositoryFacade;

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    service = new CloudModeService(facade, new MultiSelectorEngine(), logger);

    // jsdom location for normalizePageUrl filter
    const loc = new URL('https://example.com/page');
    Object.defineProperty(window, 'location', {
      value: {
        href: loc.href,
        origin: loc.origin,
        pathname: loc.pathname,
        search: loc.search,
      },
      writable: true,
      configurable: true,
    });
  });

  it('does not throw when a highlight has undefined ranges', async () => {
    const broken = {
      id: 'broken',
      text: 'x',
      contentHash: 'a'.repeat(64),
      colorRole: 'yellow',
      type: 'underscore',
      createdAt: new Date(),
      url: 'https://example.com/page',
      // ranges intentionally missing
    } as unknown as HighlightDataV2;

    getAll.mockReturnValue([broken]);

    const results = await service.restoreHighlightsForUrl();
    expect(results).toHaveLength(1);
    expect(results[0]?.restoredUsing).toBe('failed');
    expect(results[0]?.range).toBeNull();
  });

  it('uses legacy flat selectors when ranges is missing', async () => {
    const legacy = {
      id: 'legacy',
      text: 'hello world',
      contentHash: 'b'.repeat(64),
      colorRole: 'yellow',
      type: 'underscore',
      createdAt: new Date(),
      url: 'https://example.com/page',
      selectors: {
        type: 'TextQuoteSelector',
        exact: 'hello world',
      },
    } as unknown as HighlightDataV2;

    getAll.mockReturnValue([legacy]);

    // TextQuoteFinder may fail to find text in empty document — still no throw
    const results = await service.restoreHighlightsForUrl();
    expect(results).toHaveLength(1);
    expect(results[0]?.highlight.id).toBe('legacy');
  });
});
