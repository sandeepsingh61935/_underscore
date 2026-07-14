/**
 * ProMode must treat identical selection text as the existing highlight (contentHash),
 * matching BasicMode — never mint a second id.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ProMode } from '@/content/modes/pro-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

vi.mock('@/content/utils/range-converter', () => ({
  serializeRange: vi.fn().mockReturnValue({
    xpath: '/html/body/p',
    startOffset: 0,
    endOffset: 12,
    text: 'same phrase',
    textBefore: '',
    textAfter: '',
  }),
}));

function makeSelection(text: string): Selection {
  document.body.innerHTML = `<p>${text}</p>`;
  const node = document.body.firstChild!.firstChild as Text;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, text.length);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

describe('ProMode.createHighlight contentHash dedupe', () => {
  let facade: RepositoryFacade;
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

    const repo = new InMemoryHighlightRepository();
    facade = new RepositoryFacade(repo);
    await facade.initialize();

    const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as unknown as ILogger;

    mode = new ProMode(facade, eventBus, logger);
  });

  it('returns existing id when the same text is highlighted again', async () => {
    const selection = makeSelection('same phrase');
    const firstId = await mode.createHighlight(selection, 'yellow');
    const secondId = await mode.createHighlight(selection, 'yellow');

    expect(secondId).toBe(firstId);
    expect(facade.count()).toBe(1);
  });
});
