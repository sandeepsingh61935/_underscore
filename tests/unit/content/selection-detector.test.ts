/**
 * @file selection-detector.test.ts
 * @description Unit tests for SelectionDetector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SelectionDetector } from '@/content/selection-detector';
import { EventName } from '@/shared/types/events';
import { EventBus } from '@/shared/utils/event-bus';

describe('SelectionDetector', () => {
  let detector: SelectionDetector;
  let eventBus: EventBus;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    eventBus = new EventBus();
    emitSpy = vi.spyOn(eventBus, 'emit');
    detector = new SelectionDetector(eventBus);
  });

  afterEach(() => {
    if (detector.isInitialized()) {
      detector.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      detector.init();
      expect(detector.isInitialized()).toBe(true);
    });

    it('should not initialize twice', () => {
      detector.init();
      detector.init(); // Second call
      expect(detector.isInitialized()).toBe(true);
    });

    it('should clean up on destroy', () => {
      detector.init();
      detector.destroy();
      expect(detector.isInitialized()).toBe(false);
    });
  });

  describe('Double-Click Detection', () => {
    beforeEach(() => {
      detector.init();
    });

    it('should detect native double-click', () => {
      // Mock selection
      const mockSelection = {
        isCollapsed: false,
        toString: () => 'selected text',
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      // Simulate native dblclick
      const dblClickEvent = new MouseEvent('dblclick');
      document.dispatchEvent(dblClickEvent);

      expect(emitSpy).toHaveBeenCalledWith(
        EventName.SELECTION_CREATED,
        expect.objectContaining({
          type: EventName.SELECTION_CREATED,
        })
      );

      vi.unstubAllGlobals();
    });
  });

  describe('Keyboard Shortcut Detection', () => {
    beforeEach(() => {
      detector.init();
    });

    it('should detect Ctrl+U shortcut', () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => 'selected text',
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'u',
        ctrlKey: true,
      });

      const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');
      document.dispatchEvent(keyEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        EventName.SELECTION_CREATED,
        expect.any(Object)
      );

      vi.unstubAllGlobals();
    });

    it('should detect Cmd+U shortcut (Mac)', () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => 'selected text',
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'u',
        metaKey: true, // Cmd key on Mac
      });

      document.dispatchEvent(keyEvent);

      expect(emitSpy).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('should not trigger on Ctrl+Shift+U', () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => 'selected text',
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'u',
        ctrlKey: true,
        shiftKey: true, // Shift key pressed
      });

      document.dispatchEvent(keyEvent);

      expect(emitSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe('Selection Validation', () => {
    beforeEach(() => {
      detector.init();
    });

    it('should not emit for empty selection', () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => '', // Empty
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
      document.dispatchEvent(mouseUpEvent); // Double-click

      expect(emitSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('should not emit for collapsed selection (cursor only)', () => {
      const mockSelection = {
        isCollapsed: true, // Just a cursor
        toString: () => 'text',
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
      document.dispatchEvent(mouseUpEvent); // Double-click

      expect(emitSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('should not emit for whitespace-only selection', () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => '   \n\t  ', // Whitespace only
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
      document.dispatchEvent(mouseUpEvent); // Double-click

      expect(emitSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('should emit for valid text selection', () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => 'valid selection text',
        rangeCount: 1,
      };
      vi.stubGlobal('getSelection', () => mockSelection);

      // Simulate native dblclick
      const dblClickEvent = new MouseEvent('dblclick');
      document.dispatchEvent(dblClickEvent);

      expect(emitSpy).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe('Debounce Logic', () => {
    beforeEach(() => {
      detector.init();
    });

    it('should debounce rapid duplicate selection events', () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => 'double clicked word',
        rangeCount: 1,
        getRangeAt: () => ({
          compareBoundaryPoints: () => 0
        })
      };

      vi.spyOn(document, 'createRange').mockReturnValue({
        selectNode: () => { },
        compareBoundaryPoints: () => 0,
      } as unknown as Range);

      vi.stubGlobal('getSelection', () => mockSelection);

      // Simulate rapid sequence: MouseUp (Double Click) -> Click (Click-within)
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
      // Double click logic requires two mouseups in 300ms
      document.dispatchEvent(mouseUpEvent);

      // Click event coming immediately after
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: document.createElement('div') });
      document.dispatchEvent(clickEvent);

      // Should only fire once because of 200ms debounce
      expect(emitSpy).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });
  });
});
