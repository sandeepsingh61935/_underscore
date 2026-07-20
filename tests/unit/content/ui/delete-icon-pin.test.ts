/**
 * @file delete-icon-pin.test.ts
 * @description Click-to-pin delete icon (not hover).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DeleteIconOverlay } from '@/content/ui/delete-icon-overlay';
import { RangeOverlayPainter } from '@/content/paint/range-overlay-painter';
import type { ModeManager } from '@/content/modes/mode-manager';
import type { RepositoryFacade } from '@/shared/repositories';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function stubRect(): DOMRect {
  return {
    left: 10,
    top: 20,
    width: 40,
    height: 14,
    right: 50,
    bottom: 34,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('DeleteIconOverlay click-to-pin', () => {
  let overlay: DeleteIconOverlay;
  let facade: RepositoryFacade;

  beforeEach(() => {
    RangeOverlayPainter.resetForTests();
    document.body.innerHTML = '<p>hello world</p>';

    const text = document.body.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    range.getClientRects = () => [stubRect()] as unknown as DOMRectList;

    RangeOverlayPainter.getInstance().paint('hl-1', [range], 'yellow');

    facade = {
      get: vi.fn().mockReturnValue({
        id: 'hl-1',
        text: 'hello',
        colorRole: 'yellow',
      } as HighlightDataV2),
    } as unknown as RepositoryFacade;

    const modeManager = {
      getCurrentMode: () => ({
        name: 'basic',
        getDeletionConfig: () => ({
          showDeleteIcon: true,
          requireConfirmation: false,
          allowUndo: true,
          iconType: 'trash' as const,
        }),
        getHighlight: vi.fn(),
      }),
    } as unknown as ModeManager;

    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as ILogger;

    const messageBus = { send: vi.fn() } as unknown as IMessageBus;

    overlay = new DeleteIconOverlay(modeManager, facade, logger, messageBus);
  });

  afterEach(() => {
    overlay.hideAllIcons();
    RangeOverlayPainter.resetForTests();
  });

  it('togglePin shows icon and pins', () => {
    overlay.togglePin('hl-1');
    expect(overlay.getPinnedId()).toBe('hl-1');
    expect(document.querySelector('.underscore-delete-icon')).toBeTruthy();
  });

  it('second togglePin dismisses', () => {
    overlay.togglePin('hl-1');
    overlay.togglePin('hl-1');
    expect(overlay.getPinnedId()).toBeNull();
    expect(document.querySelector('.underscore-delete-icon')).toBeNull();
  });

  it('dismissPin clears pin without requiring second toggle', () => {
    overlay.togglePin('hl-1');
    overlay.dismissPin();
    expect(overlay.getPinnedId()).toBeNull();
    expect(document.querySelector('.underscore-delete-icon')).toBeNull();
  });
});
