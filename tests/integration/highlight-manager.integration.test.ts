/**
 * @file integration test for highlight creation
 * Tests real Custom Highlight API with JSDOM
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { HighlightManager } from '@/content/highlight-manager';
import { EventBus } from '@/shared/utils/event-bus';

describe('HighlightManager Integration Tests', () => {
  let manager: HighlightManager;
  let eventBus: EventBus;

  beforeEach(() => {
    // Mock CSS.highlights
    if (!global.CSS) {
      (global as any).CSS = {};
    }
    if (!global.CSS.highlights) {
      global.CSS.highlights = new Map();
    }

    // Mock Highlight constructor
    (global as any).Highlight = class {
      constructor(public range: Range) {}
    };

    eventBus = new EventBus();
    manager = new HighlightManager(eventBus);
  });

  it('should create highlight without errors', () => {
    // Create a real Range
    const range = document.createRange();
    const textNode = document.createTextNode('Test text for highlighting');
    document.body.appendChild(textNode);
    range.setStart(textNode, 0);
    range.setEnd(textNode, 10);

    // Create selection
    const selection = {
      rangeCount: 1,
      getRangeAt: () => range,
      toString: () => 'Test text',
    } as any;

    // This should not throw
    const result = manager.createHighlight(selection, '#ff0000');

    expect(result).not.toBeNull();
    expect(result?.id).toBeDefined();
    expect(result?.text).toBe('Test text');
    expect(result?.color).toBe('#ff0000');
    expect(result?.type).toBe('underscore');
  });

  it('should set highlight in CSS.highlights registry', () => {
    const range = document.createRange();
    const textNode = document.createTextNode('Test text');
    document.body.appendChild(textNode);
    range.setStart(textNode, 0);
    range.setEnd(textNode, 4);

    const selection = {
      rangeCount: 1,
      getRangeAt: () => range,
      toString: () => 'Test',
    } as any;

    const result = manager.createHighlight(selection, '#00ff00');

    // Check CSS.highlights was called
    expect(global.CSS.highlights.size).toBeGreaterThan(0);

    // Verify highlight name format
    const expectedName = `underscore-${result?.id}`;
    expect(global.CSS.highlights.has(expectedName)).toBe(true);
  });

  it('should remove highlight correctly', () => {
    const range = document.createRange();
    const textNode = document.createTextNode('Test text');
    document.body.appendChild(textNode);
    range.setStart(textNode, 0);
    range.setEnd(textNode, 4);

    const selection = {
      rangeCount: 1,
      getRangeAt: () => range,
      toString: () => 'Test',
    } as any;

    const result = manager.createHighlight(selection, '#0000ff');
    expect(result).not.toBeNull();

    const highlightId = result!.id;
    const highlightName = `underscore-${highlightId}`;

    // Verify it exists
    expect(global.CSS.highlights.has(highlightName)).toBe(true);

    // Remove it
    manager.removeHighlight(highlightId);

    // Verify it's gone
    expect(global.CSS.highlights.has(highlightName)).toBe(false);
  });
});
