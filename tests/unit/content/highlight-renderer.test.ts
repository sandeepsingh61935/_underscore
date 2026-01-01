/**
 * @file highlight-renderer.test.ts
 * @description Unit tests for HighlightRenderer
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { HighlightRenderer } from '@/content/highlight-renderer';
import { EventName } from '@/shared/types/events';
import { EventBus } from '@/shared/utils/event-bus';

describe('HighlightRenderer', () => {
  let renderer: HighlightRenderer;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    renderer = new HighlightRenderer(eventBus);

    // Setup DOM
    document.body.innerHTML = '<p id="test">Test paragraph with some text</p>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const createMockSelection = (): Selection => {
    const paragraph = document.getElementById('test')!;
    const textNode = paragraph.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 4); // "Test"

    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    return selection;
  };

  describe('createHighlight', () => {
    it('should create highlight element', () => {
      const selection = createMockSelection();

      const highlight = renderer.createHighlight(selection, '#FFEB3B')!;

      expect(highlight).toBeDefined();
      expect(highlight.id).toBeTruthy();
      expect(highlight.text).toBe('Test');
      expect(highlight.color).toBe('#FFEB3B');
      expect(highlight.element).toBeInstanceOf(HTMLElement);
    });

    it('should wrap selection in highlight element', () => {
      const selection = createMockSelection();

      renderer.createHighlight(selection, '#FFEB3B');

      const highlightElements = document.querySelectorAll('.underscore-highlight');
      expect(highlightElements.length).toBe(1);
    });

    it('should emit HIGHLIGHT_CREATED event', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const selection = createMockSelection();

      const highlight = renderer.createHighlight(selection, '#64B5F6')!;

      expect(emitSpy).toHaveBeenCalledWith(
        EventName.HIGHLIGHT_CREATED,
        expect.objectContaining({
          type: EventName.HIGHLIGHT_CREATED,
          highlight: expect.objectContaining({
            id: highlight.id,
            text: 'Test',
            color: '#64B5F6',
            type: 'underscore',
            createdAt: expect.any(Date),
          }),
        })
      );
    });

    it('should store element reference', () => {
      const selection = createMockSelection();

      renderer.createHighlight(selection, '#FFEB3B');

      expect(renderer.count()).toBe(1);
    });
  });

  describe('removeHighlight', () => {
    it('should remove highlight element', async () => {
      vi.useFakeTimers();
      const selection = createMockSelection();
      const highlight = renderer.createHighlight(selection, '#FFEB3B')!;

      renderer.removeHighlight(highlight.id);

      // Wait for animation
      vi.advanceTimersByTime(250);
      expect(renderer.count()).toBe(0);

      vi.useRealTimers();
    });

    it('should handle removing non-existent highlight', () => {
      expect(() => {
        renderer.removeHighlight('non-existent');
      }).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should remove all highlights', () => {
      vi.useFakeTimers();
      // Create multiple highlights
      const paragraph = document.getElementById('test')!;
      const textNode = paragraph.firstChild!;

      // First highlight
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 4);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      renderer.createHighlight(selection, '#FFEB3B');

      expect(renderer.count()).toBeGreaterThan(0);

      renderer.clearAll();

      // Check after animation
      vi.advanceTimersByTime(250);
      expect(renderer.count()).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Event Listeners', () => {
    it('should remove highlight when HIGHLIGHT_REMOVED event is emitted', () => {
      vi.useFakeTimers();
      const selection = createMockSelection();
      const highlight = renderer.createHighlight(selection, '#FFEB3B')!;

      eventBus.emit(EventName.HIGHLIGHT_REMOVED, {
        type: EventName.HIGHLIGHT_REMOVED,
        highlightId: highlight.id,
        timestamp: new Date(),
      });

      vi.advanceTimersByTime(250);
      expect(renderer.count()).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Click to Remove', () => {
    it('should emit events when highlight is clicked', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const selection = createMockSelection();

      const highlight = renderer.createHighlight(selection, '#FFEB3B')!;

      // Simulate click
      highlight.element.click();

      expect(emitSpy).toHaveBeenCalledWith(
        EventName.HIGHLIGHT_CLICKED,
        expect.objectContaining({
          type: EventName.HIGHLIGHT_CLICKED,
          highlightId: highlight.id,
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        EventName.HIGHLIGHT_REMOVED,
        expect.objectContaining({
          type: EventName.HIGHLIGHT_REMOVED,
          highlightId: highlight.id,
        })
      );
    });
  });
});
