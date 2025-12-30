import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiSelectorEngine } from '@/services/multi-selector-engine';

describe('MultiSelectorEngine', () => {
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

  describe('XPath Selector', () => {
    it('should create XPath selector for simple text range', () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 8);
      range.setEnd(textNode, 17);

      const selector = engine.createXPathSelector(range);

      expect(selector.text).toBe('the first');
      expect(selector.startOffset).toBe(8);
      expect(selector.xpath).toContain('p');
    });

    it('should restore using XPath when DOM is unchanged', async () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 8);
      range.setEnd(textNode, 17);

      const selector = engine.createXPathSelector(range);
      const restored = await engine.tryXPath(selector);

      expect(restored).not.toBeNull();
      expect(restored!.toString()).toBe('the first');
    });
  });

  describe('Position Selector', () => {
    it('should create position selector with absolute offsets', () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 8);
      range.setEnd(textNode, 17);

      const selector = engine.createPositionSelector(range);

      expect(selector.text).toBe('the first');
      expect(selector.startOffset).toBeGreaterThan(0);
    });

    it('should restore using position when XPath fails', async () => {
      const p2 = document.getElementById('p2')!;
      const textNode = p2.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 12);
      range.setEnd(textNode, 28);

      const selector = engine.createPositionSelector(range);

      // Break XPath by wrapping
      const wrapper = document.createElement('span');
      p2.parentElement!.insertBefore(wrapper, p2);
      wrapper.appendChild(p2);

      const restored = await engine.tryPosition(selector);
      expect(restored).not.toBeNull();
    });
  });

  describe('Fuzzy Selector', () => {
    it('should create fuzzy selector with large context', () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 8);
      range.setEnd(textNode, 17);

      const selector = engine.createFuzzySelector(range);

      expect(selector.text).toBe('the first');
      expect(selector.threshold).toBe(0.8);
      expect(selector.textBefore.length).toBeLessThanOrEqual(50);
    });

    it('should restore using fuzzy matching', async () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 8);
      range.setEnd(textNode, 17);

      const selector = engine.createFuzzySelector(range);
      const restored = await engine.tryFuzzyMatch(selector);

      expect(restored).not.toBeNull();
      expect(restored!.toString()).toBe('the first');
    });

    it('should handle content changes robustly', async () => {
      const p2 = document.getElementById('p2')!;
      const textNode = p2.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 12);
      range.setEnd(textNode, 28);

      const selector = engine.createFuzzySelector(range);

      // Insert content before (breaks position offsets)
      const newP = document.createElement('p');
      newP.textContent = 'Inserted paragraph.';
      p2.parentElement!.insertBefore(newP, p2);

      const restored = await engine.tryFuzzyMatch(selector);
      expect(restored).not.toBeNull();
    });
  });

  describe('3-Tier Integration', () => {
    it('should create multi-selector with all 3 tiers', () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 8);
      range.setEnd(textNode, 17);

      const multiSelector = engine.createSelectors(range);

      expect(multiSelector.xpath).toBeDefined();
      expect(multiSelector.position).toBeDefined();
      expect(multiSelector.fuzzy).toBeDefined();
    });

    it('should use tier 1 (XPath) when available', async () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 8);
      range.setEnd(textNode, 17);

      const multi = engine.createSelectors(range);
      const restored = await engine.restore(multi);

      expect(restored).not.toBeNull();
      expect(restored!.toString()).toBe('the first');
    });

    it('should fall back through tiers when needed', async () => {
      const p2 = document.getElementById('p2')!;
      const textNode = p2.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 12);
      range.setEnd(textNode, 28);

      const multi = engine.createSelectors(range);

      // Break XPath and Position
      const newP = document.createElement('p');
      newP.textContent = 'New content.';
      p2.parentElement!.insertBefore(newP, p2);

      const restored = await engine.restore(multi);
      expect(restored).not.toBeNull(); // Fuzzy should succeed
    });

    it('should return null when all tiers fail', async () => {
      const p1 = document.getElementById('p1')!;
      const textNode = p1.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 10);

      const multi = engine.createSelectors(range);

      // Remove text completely
      p1.textContent = 'Completely different unrelated content.';

      const restored = await engine.restore(multi);
      expect(restored).toBeNull();
    });
  });
});
