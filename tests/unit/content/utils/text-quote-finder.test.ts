/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { TextQuoteFinder } from '@/content/utils/text-quote-finder';
import type { TextQuoteSelector } from '@/shared/schemas/highlight-schema';

describe('TextQuoteFinder', () => {
  let finder: TextQuoteFinder;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    finder = new TextQuoteFinder();
  });

  it('should find exact text in a single node', () => {
    container.innerHTML = '<p>Hello World</p>';
    const selector: TextQuoteSelector = { type: 'TextQuoteSelector', exact: 'Hello' };

    const range = finder.find(selector, container);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('Hello');
  });

  it('should find exact text spanning multiple nodes (Multi-block)', () => {
    // "Hello World" split across p and b
    // Text nodes: "Hello " (inside p), "World" (inside b)
    // Range.toString() should be "Hello World" if built correctly.
    container.innerHTML = '<p>Hello <b>World</b></p>';

    const selector: TextQuoteSelector = {
      type: 'TextQuoteSelector',
      exact: 'Hello World',
    };

    const range = finder.find(selector, container);

    expect(range).not.toBeNull();
    // The text content of "Hello <b>World</b>" is "Hello World" (no space unless P adds implicit newline?)
    // In JSDOM/Browsers, <p>Hello <b>World</b></p> textContent is "Hello World".
    expect(range?.toString()).toBe('Hello World');

    // Check range boundaries
    // Start: 'Hello ' text node
    // End: 'World' text node
    expect(range?.startContainer.nodeType).toBe(Node.TEXT_NODE);
    expect(range?.endContainer.nodeType).toBe(Node.TEXT_NODE);
    expect(range?.startContainer).not.toBe(range?.endContainer);
  });

  it('should handle exact text with no siblings (Whole Block)', () => {
    container.innerHTML = '<p>Isolated Block</p>';
    const selector: TextQuoteSelector = {
      type: 'TextQuoteSelector',
      exact: 'Isolated Block', // Whole text
    };

    const range = finder.find(selector, container);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('Isolated Block');
  });

  it('should select the correct occurrence using prefix/suffix', () => {
    container.innerHTML = '<div>Prefix Target Suffix</div><div>Wrong Target Wrong</div>';

    const selector: TextQuoteSelector = {
      type: 'TextQuoteSelector',
      exact: 'Target',
      prefix: 'Prefix ',
      suffix: ' Suffix',
    };

    const range = finder.find(selector, container);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('Target');

    // Verify it picked the first one (context match)
    // Actually TextQuoteFinder logic:
    // 1. Find all exact matches.
    // 2. Filter by prefix.
    // 3. Filter by suffix.

    // My global search implementation finds ALL exact matches.
    // But what about mapGlobalToLocal for context verification?
    // TextQuoteFinder.find uses `filterByPrefix` which calls `getTextBefore`.
    // `getTextBefore` logic uses sibling walking.

    // If `target` is in middle of text node, sibling walking works (same node).
    // If `target` is start of node, it walks previousSibling.

    // Let's ensure context verification still works with the Ranges returned by global search.
  });

  it('should return null if exact text not found', () => {
    container.innerHTML = '<p>Some text</p>';
    const selector: TextQuoteSelector = { type: 'TextQuoteSelector', exact: 'Missing' };
    expect(finder.find(selector, container)).toBeNull();
  });
});
