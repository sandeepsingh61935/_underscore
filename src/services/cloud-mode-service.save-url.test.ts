/**
 * saveHighlight: url required; durable write via addPersisted (PRD L1).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudModeService } from './cloud-mode-service';
import { MultiSelectorEngine } from './multi-selector-engine';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/interfaces/i-logger';

function makeHighlight(over: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    text: 'quoted text',
    contentHash: 'a'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/html/body/p[1]',
        startOffset: 0,
        endOffset: 11,
        text: 'quoted text',
        textBefore: '',
        textAfter: '',
      },
    ],
    createdAt: new Date(),
    ...over,
  };
}

describe('CloudModeService.saveHighlight', () => {
  let added: HighlightDataV2[];
  let addPersistedOrder: string[];
  let facade: RepositoryFacade;
  let service: CloudModeService;

  beforeEach(() => {
    added = [];
    addPersistedOrder = [];
    facade = {
      add: vi.fn(),
      addPersisted: vi.fn(async (h: HighlightDataV2) => {
        addPersistedOrder.push('start');
        // Simulate async durable write
        await Promise.resolve();
        added.push(h);
        addPersistedOrder.push('done');
      }),
    } as unknown as RepositoryFacade;

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    service = new CloudModeService(facade, new MultiSelectorEngine(), logger);
  });

  it('sets url from the current page when highlight has no url', async () => {
    const range = document.createRange();
    const highlight = makeHighlight();
    delete (highlight as { url?: string }).url;

    await service.saveHighlight(highlight, range);

    expect(facade.addPersisted).toHaveBeenCalledTimes(1);
    expect(facade.add).not.toHaveBeenCalled();
    const payload = added[0];
    expect(payload).toBeDefined();
    expect(payload!.url).toBeTruthy();
    expect(typeof payload!.url).toBe('string');
    expect(payload!.url!.length).toBeGreaterThan(0);
  });

  it('preserves an explicit url when provided', async () => {
    const range = document.createRange();
    const highlight = makeHighlight({ url: 'https://docs.example.com/page' });

    await service.saveHighlight(highlight, range);

    expect(added[0]?.url).toBe('https://docs.example.com/page');
  });

  it('does not resolve until addPersisted completes (L1/L7)', async () => {
    let resolvePersist!: () => void;
    const gate = new Promise<void>((r) => {
      resolvePersist = r;
    });
    (facade.addPersisted as ReturnType<typeof vi.fn>).mockImplementation(
      async (h: HighlightDataV2) => {
        await gate;
        added.push(h);
      }
    );

    const range = document.createRange();
    let finished = false;
    const pending = service
      .saveHighlight(makeHighlight({ url: 'https://a.test/x' }), range)
      .then(() => {
        finished = true;
      });

    await Promise.resolve();
    expect(finished).toBe(false);

    resolvePersist();
    await pending;
    expect(finished).toBe(true);
    expect(added).toHaveLength(1);
  });
});
