import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiSelectorEngine } from '@/services/multi-selector-engine';
import type { XPathSelector } from '@/services/multi-selector-engine';

describe('MultiSelectorEngine - XPath', () => {
    let engine: MultiSelectorEngine;
    let testContainer: HTMLDivElement;

    beforeEach(() => {
        engine = new MultiSelectorEngine();

        // Create a test DOM structure
        testContainer = document.createElement('div');
        testContainer.innerHTML = `
      <article>
        <h1>Test Article</h1>
        <p id="p1">This is the first paragraph with some test content.</p>
        <p id="p2">This is the second paragraph with more content for testing.</p>
        <div class="content">
          <p id="p3">Nested paragraph inside a div element.</p>
        </div>
      </article>
    `;
        document.body.appendChild(testContainer);
    });

    afterEach(() => {
        document.body.removeChild(testContainer);
    });

    describe('createXPathSelector', () => {
        it('should create XPath selector for simple text range', () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 8); // "the first"
            range.setEnd(textNode, 17);

            const selector = engine.createXPathSelector(range);

            expect(selector).toBeDefined();
            expect(selector.text).toBe('the first');
            expect(selector.startOffset).toBe(8);
            expect(selector.endOffset).toBe(17);
            expect(selector.xpath).toContain('p');
            expect(selector.textBefore).toBe('This is ');
            expect(selector.textAfter).toBe(' paragraph');
        });

        it('should create XPath with correct node positions', () => {
            const p2 = document.getElementById('p2')!;
            const textNode = p2.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 10);

            const selector = engine.createXPathSelector(range);

            // XPath should include position indices
            expect(selector.xpath).toMatch(/\[\d+\]/); // Contains [N] positions
            expect(selector.xpath).toContain('text()');
        });

        it('should extract context text before highlight', () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 30); // "test content"
            range.setEnd(textNode, 42);

            const selector = engine.createXPathSelector(range);

            expect(selector.textBefore).toBe('t paragraph with some ');
            expect(selector.textBefore.length).toBeLessThanOrEqual(30);
        });

        it('should extract context text after highlight', () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 8);
            range.setEnd(textNode, 17); // "the first"

            const selector = engine.createXPathSelector(range);

            expect(selector.textAfter).toBe(' paragraph with some test cont');
            expect(selector.textAfter.length).toBeLessThanOrEqual(30);
        });

        it('should handle nested elements correctly', () => {
            const p3 = document.getElementById('p3')!;
            const textNode = p3.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 16); // "Nested paragraph"

            const selector = engine.createXPathSelector(range);

            expect(selector.text).toBe('Nested paragraph');
            expect(selector.xpath).toContain('div');
            expect(selector.xpath).toContain('p');
        });
    });

    describe('tryXPath', () => {
        it('should restore range using valid XPath selector', async () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            // Create original range
            const originalRange = document.createRange();
            originalRange.setStart(textNode, 8);
            originalRange.setEnd(textNode, 17); // "the first"

            // Create selector
            const selector = engine.createXPathSelector(originalRange);

            // Try to restore
            const restoredRange = await engine.tryXPath(selector);

            expect(restoredRange).not.toBeNull();
            expect(restoredRange!.toString()).toBe('the first');
            expect(restoredRange!.startOffset).toBe(8);
            expect(restoredRange!.endOffset).toBe(17);
        });

        it('should return null for invalid XPath', async () => {
            const invalidSelector: XPathSelector = {
                xpath: '/html/body/nonexistent/element',
                startOffset: 0,
                endOffset: 10,
                text: 'test',
                textBefore: '',
                textAfter: '',
            };

            const result = await engine.tryXPath(invalidSelector);

            expect(result).toBeNull();
        });

        it('should return null when text content does not match', async () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const originalRange = document.createRange();
            originalRange.setStart(textNode, 8);
            originalRange.setEnd(textNode, 17);

            const selector = engine.createXPathSelector(originalRange);

            // Modify the selector to have wrong text
            selector.text = 'wrong text';

            const result = await engine.tryXPath(selector);

            expect(result).toBeNull();
        });

        it('should restore correctly after DOM modifications that preserve XPath', async () => {
            const p2 = document.getElementById('p2')!;
            const textNode = p2.firstChild!;

            // Create selector before modification
            const range = document.createRange();
            range.setStart(textNode, 12);
            range.setEnd(textNode, 25); // "second paragraph"

            const selector = engine.createXPathSelector(range);

            // Modify unrelated element (should not affect XPath)
            const p1 = document.getElementById('p1')!;
            p1.textContent = 'Modified first paragraph';

            // Try to restore
            const restoredRange = await engine.tryXPath(selector);

            expect(restoredRange).not.toBeNull();
            expect(restoredRange!.toString()).toBe('second paragraph');
        });

        it('should fail gracefully when DOM structure changes break XPath', async () => {
            const p2 = document.getElementById('p2')!;
            const textNode = p2.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 10);

            const selector = engine.createXPathSelector(range);

            // Remove the element (breaks XPath)
            p2.remove();

            const result = await engine.tryXPath(selector);

            expect(result).toBeNull();
        });
    });

    describe('createSelectors', () => {
        it('should create multi-selector with XPath', () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 8);
            range.setEnd(textNode, 17);

            const multiSelector = engine.createSelectors(range);

            expect(multiSelector).toBeDefined();
            expect(multiSelector.xpath).toBeDefined();
            expect(multiSelector.xpath.text).toBe('the first');
            expect(multiSelector.contentHash).toBeDefined();
            expect(multiSelector.createdAt).toBeGreaterThan(0);
        });

        it('should generate consistent content hash for same text', () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const range1 = document.createRange();
            range1.setStart(textNode, 8);
            range1.setEnd(textNode, 17);

            const range2 = document.createRange();
            range2.setStart(textNode, 8);
            range2.setEnd(textNode, 17);

            const selector1 = engine.createSelectors(range1);
            const selector2 = engine.createSelectors(range2);

            expect(selector1.contentHash).toBe(selector2.contentHash);
        });
    });

    describe('restore', () => {
        it('should restore highlight using XPath strategy', async () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const originalRange = document.createRange();
            originalRange.setStart(textNode, 8);
            originalRange.setEnd(textNode, 17);

            const multiSelector = engine.createSelectors(originalRange);

            const restoredRange = await engine.restore(multiSelector);

            expect(restoredRange).not.toBeNull();
            expect(restoredRange!.toString()).toBe('the first');
        });

        it('should return null when all strategies fail', async () => {
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 10);

            const multiSelector = engine.createSelectors(range);

            // Remove element to break XPath
            p1.remove();

            const result = await engine.restore(multiSelector);

            expect(result).toBeNull();
        });
    });
});
