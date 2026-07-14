/**
 * @file markdown-wrap.test.ts
 * @description Pure wrap / pretty-print helpers for highlight markdown editor.
 */
import { describe, expect, it } from 'vitest';

import {
  applyMarkdownShortcut,
  fenceWrapPretty,
  prettyPrintCode,
  wrapSelection,
} from '@/shared/utils/markdown-wrap';

describe('wrapSelection', () => {
  it('wraps a non-empty selection and keeps selection on inner content', () => {
    const r = wrapSelection('hello world', 6, 11, '**', '**');
    expect(r.text).toBe('hello **world**');
    expect(r.selStart).toBe(8);
    expect(r.selEnd).toBe(13);
  });

  it('inserts empty markers with cursor between when selection is empty', () => {
    const r = wrapSelection('ab', 1, 1, '**', '**');
    expect(r.text).toBe('a****b');
    expect(r.selStart).toBe(3);
    expect(r.selEnd).toBe(3);
  });
});

describe('prettyPrintCode', () => {
  it('breaks flattened braces and semicolons', () => {
    const out = prettyPrintCode('while (x) { int a = 1; }');
    expect(out).toContain('while (x) {');
    expect(out).toContain('int a = 1;');
    expect(out.split('\n').length).toBeGreaterThan(1);
  });

  it('leaves already-indented multi-line code alone', () => {
    const src = 'while (x) {\n  int a = 1;\n}';
    expect(prettyPrintCode(src)).toBe(src.trim());
  });
});

describe('fenceWrapPretty', () => {
  it('wraps selection in plain fences and pretty-prints', () => {
    const r = fenceWrapPretty('x while (q) { a(); } y', 2, 20);
    expect(r.text.startsWith('x ```\n')).toBe(true);
    expect(r.text).toContain('```');
    expect(r.text).toContain('while (q)');
  });

  it('inserts empty fence with cursor on inner line when no selection', () => {
    const r = fenceWrapPretty('hi', 2, 2);
    expect(r.text).toBe('hi```\n\n```');
    // cursor after "```\n" (4 chars) from index 2 → 6
    expect(r.selStart).toBe(6);
    expect(r.selEnd).toBe(6);
  });
});

describe('applyMarkdownShortcut', () => {
  it('handles Ctrl+B bold', () => {
    const r = applyMarkdownShortcut('ab', 0, 2, 'b', {
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
    });
    expect(r?.text).toBe('**ab**');
  });

  it('handles Ctrl+Shift+C fence', () => {
    const r = applyMarkdownShortcut('code here', 0, 9, 'c', {
      metaKey: false,
      ctrlKey: true,
      shiftKey: true,
    });
    expect(r?.text).toContain('```');
  });

  it('returns null without modifier', () => {
    expect(
      applyMarkdownShortcut('ab', 0, 2, 'b', {
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
      }),
    ).toBeNull();
  });
});
