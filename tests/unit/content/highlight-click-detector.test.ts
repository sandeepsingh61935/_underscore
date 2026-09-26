import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HIGHLIGHT_ACTIONS_OPEN,
  HighlightClickDetector,
} from '@/content/highlight-click-detector';
import { EventName } from '@/shared/types/events';

function bus() {
  const handlers = new Map<string, Array<(payload: never) => void>>();
  return {
    emit: vi.fn((event: string, payload: never) => {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    }),
    on: vi.fn((event: string, handler: (payload: never) => void) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    }),
  };
}

function clickAt(x: number, y: number, init: MouseEventInit = {}): void {
  document.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      ...init,
    })
  );
}

describe('HighlightClickDetector', () => {
  let eventBus: ReturnType<typeof bus>;

  beforeEach(() => {
    eventBus = bus();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function detector(hit: { id: string } | null): HighlightClickDetector {
    const hitTester = { findHighlightAtPoint: vi.fn().mockReturnValue(hit) };
    const d = new HighlightClickDetector(eventBus as never, hitTester as never);
    d.init();
    return d;
  }

  it('plain click on a highlight opens the actions pill', () => {
    const d = detector({ id: 'hl-1' });
    clickAt(15, 25);
    expect(eventBus.emit).toHaveBeenCalledWith(
      HIGHLIGHT_ACTIONS_OPEN,
      expect.objectContaining({ highlightId: 'hl-1' })
    );
    d.destroy();
  });

  it('Ctrl+Click deletes instead of opening the pill', () => {
    const d = detector({ id: 'hl-1' });
    clickAt(15, 25, { ctrlKey: true });
    expect(eventBus.emit).toHaveBeenCalledWith(
      EventName.HIGHLIGHT_CLICKED,
      expect.objectContaining({ highlightId: 'hl-1' })
    );
    expect(eventBus.emit).not.toHaveBeenCalledWith(
      HIGHLIGHT_ACTIONS_OPEN,
      expect.anything()
    );
    d.destroy();
  });

  it('click outside any highlight emits nothing (the pill self-dismisses)', () => {
    const d = detector(null);
    clickAt(5, 5);
    expect(eventBus.emit).not.toHaveBeenCalled();
    d.destroy();
  });
});
