/**
 * @file test-utilities.test.ts
 * @description Tests for test helper utilities
 *
 * Following testing-strategy-v2: We test our testing tools to ensure reliability
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  createMockTab,
  MockChromeStorage,
  resetChromeMocks,
} from '../../helpers/chrome-helpers';
import {
  createMockSelection,
  createTextNode,
  createParagraph,
  cleanupDOM,
  createContainer,
  simulateUserSelection,
} from '../../helpers/dom-helpers';

describe('Test Utilities (10 tests)', () => {
  describe('DOM Helpers', () => {
    afterEach(() => {
      cleanupDOM();
    });

    it('1. createTextNode creates valid text node', () => {
      const node = createTextNode('test text');
      expect(node.nodeType).toBe(Node.TEXT_NODE);
      expect(node.textContent).toBe('test text');
    });

    it('2. createParagraph creates paragraph with text', () => {
      const p = createParagraph('paragraph text');
      expect(p.tagName).toBe('P');
      expect(p.textContent).toBe('paragraph text');
    });

    it('3. createContainer creates div and appends to body', () => {
      const container = createContainer('test-container');
      expect(container.tagName).toBe('DIV');
      expect(container.id).toBe('test-container');
      expect(document.body.contains(container)).toBe(true);
    });

    it('4. createMockSelection creates valid selection', () => {
      const selection = createMockSelection('selected text');
      expect(selection.toString()).toBe('selected text');
      expect(selection.rangeCount).toBe(1);
    });

    it('5. simulateUserSelection creates selection in range', () => {
      const { selection, element } = simulateUserSelection('Hello World', 0, 5);
      expect(selection.toString()).toBe('Hello');
      expect(document.body.contains(element)).toBe(true);
    });

    it('6. cleanupDOM removes all children and selections', () => {
      createContainer();
      createMockSelection('test');

      cleanupDOM();

      expect(document.body.children.length).toBe(0);
      const selection = window.getSelection();
      expect(selection?.rangeCount).toBe(0);
    });
  });

  describe('Chrome Helpers', () => {
    beforeEach(() => {
      resetChromeMocks();
    });

    it('7. createMockTab creates valid tab', () => {
      const tab = createMockTab();
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('url');
      expect(tab.active).toBe(true);
    });

    it('8. createMockTab accepts overrides', () => {
      const tab = createMockTab({ url: 'https://custom.com', id: 99 });
      expect(tab.url).toBe('https://custom.com');
      expect(tab.id).toBe(99);
    });

    it('9. MockChromeStorage stores and retrieves data', async () => {
      const storage = new MockChromeStorage();

      await storage.set({ key1: 'value1', key2: 'value2' });
      const result = await storage.get('key1');

      expect(result).toEqual({ key1: 'value1' });
    });

    it('10. MockChromeStorage clear removes all data', async () => {
      const storage = new MockChromeStorage();

      await storage.set({ key1: 'val1', key2: 'val2' });
      await storage.clear();
      const result = await storage.get();

      expect(result).toEqual({});
    });
  });
});
