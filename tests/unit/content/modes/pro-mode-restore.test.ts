/**
 * ProMode.restore must hydrate via the highlight reader (IPC) into the shared
 * facade, then paint — not rely on an orphan empty CloudModeService store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ProMode } from '@/content/modes/pro-mode';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

function makeStoredHighlight(overrides: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: 'hl-restore-1',
    text: 'restored phrase',
    contentHash: 'b'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    url: 'https://example.com/article',
    ranges: [
      {
        xpath: '/html/body/p',
        startOffset: 0,
        endOffset: 15,
        text: 'restored phrase',
        textBefore: '',
        textAfter: '',
        selector: {
          type: 'TextQuoteSelector',
          exact: 'restored phrase',
        },
      },
    ],
    ...overrides,
  };
}

describe('ProMode.restore IPC hydrate + paint', () => {
  let facade: RepositoryFacade;
  let reader: IReadableHighlightRepository;
  let mode: ProMode;

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Highlight = class {
      private ranges = new Set<Range>();
      add(range: Range): void {
        this.ranges.add(range);
      }
      has(range: Range): boolean {
        return this.ranges.has(range);
      }
      delete(range: Range): boolean {
        return this.ranges.delete(range);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CSS as any).highlights = new Map();

    document.body.innerHTML = '<p>restored phrase</p>';
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/article#section' },
      writable: true,
      configurable: true,
    });

    const repo = new InMemoryHighlightRepository();
    facade = new RepositoryFacade(repo);
    await facade.initialize();
    // Facade starts empty (simulates content reload). Reader returns persisted row.
    expect(facade.count()).toBe(0);

    reader = {
      findByUrl: vi.fn().mockResolvedValue([makeStoredHighlight()]),
      findById: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
      exists: vi.fn(),
      findByContentHash: vi.fn(),
      findOverlapping: vi.fn(),
    };

    const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as unknown as ILogger;

    mode = new ProMode(facade, eventBus, logger, { highlightReader: reader });
  });

  it('hydrates from reader and paints the restored highlight', async () => {
    await mode.restore();

    expect(reader.findByUrl).toHaveBeenCalled();
    expect(mode.getAllHighlights()).toHaveLength(1);
    expect(mode.getHighlight('hl-restore-1')?.text).toBe('restored phrase');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const painted = (CSS as any).highlights.size;
    expect(painted).toBeGreaterThan(0);
  });
});
