/**
 * @file markdown-wrap.test.ts
 * @description Pure wrap / pretty-print helpers for highlight markdown editor.
 */
import { describe, expect, it } from 'vitest';

import {
  applyBulletList,
  applyMarkdownFormatAction,
  applyMarkdownShortcut,
  applyNumberedList,
  fenceWrapPretty,
  looksAlreadyPretty,
  prettyPrintCode,
  toggleWrapSelection,
  tryUnfence,
  wrapSelection,
} from '@/shared/utils/markdown-wrap';

const FLAT_BFS =
  'while (!q.empty()) { int size = q.size(); // One unit of time / level / semester answer++; while (size--) { int node = q.front(); q.pop(); // Process current level only for (auto next : adj[node]) { if (/* next becomes available */) { q.push(next); } } }}';

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

  it('pretty-prints the BFS level-order flattened capture', () => {
    const out = prettyPrintCode(FLAT_BFS);
    expect(out).toContain('while (!q.empty()) {');
    expect(out).toContain('int size = q.size();');
    expect(out).toMatch(/\/\/ One unit of time \/ level \/ semester/);
    expect(out).toContain('answer++;');
    expect(out).toContain('while (size--) {');
    expect(out).toContain('for (auto next : adj[node]) {');
    // Nested structure: outer while, then indented body
    const lines = out.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(10);
    expect(lines.some((l) => l.startsWith('  int size'))).toBe(true);
    expect(lines.some((l) => l.startsWith('    int node'))).toBe(true);
  });

  it('pretty-prints soft-wrapped multi-line flat captures', () => {
    // Capture often inserts newlines without real indent
    const soft = 'while (!q.empty()) {\nint size = q.size();\nanswer++;\n}';
    const out = prettyPrintCode(soft);
    expect(looksAlreadyPretty(soft)).toBe(false);
    expect(out.split('\n').length).toBeGreaterThan(2);
    expect(out).toContain('int size = q.size();');
  });

  it('leaves already-indented multi-line code alone', () => {
    const src = 'while (x) {\n  int a = 1;\n  if (a) {\n    b();\n  }\n}';
    expect(prettyPrintCode(src)).toBe(src.trim());
  });
});

describe('fenceWrapPretty', () => {
  it('wraps selection in plain fences and pretty-prints BFS template', () => {
    const doc = `Generic Template\n\n${FLAT_BFS}\n\nCore Idea`;
    const start = doc.indexOf('while');
    const end = start + FLAT_BFS.length;
    const r = fenceWrapPretty(doc, start, end);
    expect(r.text).toContain('```\nwhile (!q.empty()) {');
    expect(r.text).toContain('  answer++;');
    expect(r.text).toContain('\n```');
    expect(r.text).toContain('Core Idea');
  });

  it('inserts empty fence with cursor on inner line when no selection', () => {
    const r = fenceWrapPretty('hi', 2, 2);
    expect(r.text).toBe('hi```\n\n```');
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

  it('handles Ctrl+Shift+K fence (Chrome-safe binding)', () => {
    const r = applyMarkdownShortcut(FLAT_BFS, 0, FLAT_BFS.length, 'k', {
      metaKey: false,
      ctrlKey: true,
      shiftKey: true,
    });
    expect(r?.text).toContain('```\nwhile');
    expect(r?.text).toContain('  int size');
  });

  it('still accepts Ctrl+Shift+C when the host does not steal it', () => {
    const r = applyMarkdownShortcut('a();', 0, 4, 'c', {
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
      })
    ).toBeNull();
  });
});

describe('list format actions', () => {
  it('applies bullets to selected lines', () => {
    const r = applyBulletList('a\nb', 0, 3);
    expect(r.text).toBe('- a\n- b');
  });

  it('applies numbered list to selected lines', () => {
    const r = applyNumberedList('a\nb', 0, 3);
    expect(r.text).toBe('1. a\n2. b');
  });

  it('toggles bullets off when already bulleted', () => {
    const r = applyBulletList('- a\n- b', 0, 7);
    expect(r.text).toBe('a\nb');
  });

  it('routes format actions through applyMarkdownFormatAction', () => {
    expect(applyMarkdownFormatAction('x', 0, 1, 'bold').text).toBe('**x**');
    expect(applyMarkdownFormatAction('a\nb', 0, 3, 'bullets').text).toBe('- a\n- b');
  });
});

describe('toggleWrapSelection', () => {
  it('wraps plain selection with bold', () => {
    const r = toggleWrapSelection('hello', 0, 5, '**', '**');
    expect(r.text).toBe('**hello**');
    expect(r.selStart).toBe(2);
    expect(r.selEnd).toBe(7);
  });

  it('unwraps when selection includes bold markers', () => {
    const r = toggleWrapSelection('**hello**', 0, 9, '**', '**');
    expect(r.text).toBe('hello');
    expect(r.selStart).toBe(0);
    expect(r.selEnd).toBe(5);
  });

  it('unwraps when bold markers flank the selection', () => {
    const r = toggleWrapSelection('**hello**', 2, 7, '**', '**');
    expect(r.text).toBe('hello');
  });

  it('does not nest bold on already-bold selection (inner)', () => {
    const once = applyMarkdownFormatAction('hello', 0, 5, 'bold');
    const twice = applyMarkdownFormatAction(
      once.text,
      once.selStart,
      once.selEnd,
      'bold'
    );
    expect(twice.text).toBe('hello');
  });

  it('does not nest bold when markers are selected', () => {
    const twice = applyMarkdownFormatAction('**hello**', 0, 9, 'bold');
    expect(twice.text).toBe('hello');
  });

  it('toggles italic without treating bold as italic', () => {
    const bold = '**hello**';
    // Inner "hello" with italic must NOT strip one star from bold.
    const r = toggleWrapSelection(bold, 2, 7, '*', '*');
    expect(r.text).toBe('***hello***');
    // Selecting full bold span with italic tool should wrap outer, not unwrap bold.
    const outer = toggleWrapSelection(bold, 0, 9, '*', '*');
    expect(outer.text).toBe('***hello***');
  });

  it('toggles italic on single-star wrap', () => {
    expect(toggleWrapSelection('*hi*', 0, 4, '*', '*').text).toBe('hi');
    expect(toggleWrapSelection('*hi*', 1, 3, '*', '*').text).toBe('hi');
  });

  it('toggles inline code', () => {
    expect(toggleWrapSelection('`x`', 0, 3, '`', '`').text).toBe('x');
    expect(toggleWrapSelection('`x`', 1, 2, '`', '`').text).toBe('x');
    expect(applyMarkdownFormatAction('x', 0, 1, 'code').text).toBe('`x`');
    expect(applyMarkdownFormatAction('`x`', 0, 3, 'code').text).toBe('x');
  });

  it('unwraps empty markers when caret sits between them', () => {
    // **|**
    const r = toggleWrapSelection('****', 2, 2, '**', '**');
    expect(r.text).toBe('');
  });

  it('Ctrl+B twice returns to plain text', () => {
    const once = applyMarkdownShortcut('ab', 0, 2, 'b', {
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
    });
    expect(once?.text).toBe('**ab**');
    const twice = applyMarkdownShortcut(once!.text, once!.selStart, once!.selEnd, 'b', {
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
    });
    expect(twice?.text).toBe('ab');
  });
});

describe('toggleStarEmphasis (no star stacking)', () => {
  it('alternating bold and italic stays at most ***inner***', () => {
    let text = 'hello';
    let s = 0;
    let e = 5;

    let r = applyMarkdownFormatAction(text, s, e, 'bold');
    text = r.text;
    s = r.selStart;
    e = r.selEnd;
    expect(text).toBe('**hello**');

    r = applyMarkdownFormatAction(text, s, e, 'italic');
    text = r.text;
    s = r.selStart;
    e = r.selEnd;
    expect(text).toBe('***hello***');

    r = applyMarkdownFormatAction(text, s, e, 'bold');
    text = r.text;
    s = r.selStart;
    e = r.selEnd;
    expect(text).toBe('*hello*');

    r = applyMarkdownFormatAction(text, s, e, 'italic');
    expect(r.text).toBe('hello');
  });

  it('alternating on full marker selection does not nest', () => {
    let r = applyMarkdownFormatAction('hello', 0, 5, 'bold');
    r = applyMarkdownFormatAction(r.text, 0, r.text.length, 'italic');
    expect(r.text).toBe('***hello***');
    r = applyMarkdownFormatAction(r.text, 0, r.text.length, 'bold');
    expect(r.text).toBe('*hello*');
    r = applyMarkdownFormatAction(r.text, 0, r.text.length, 'italic');
    expect(r.text).toBe('hello');
    // Five more alternations stay bounded
    for (let i = 0; i < 5; i++) {
      r = applyMarkdownFormatAction(
        r.text,
        0,
        r.text.length,
        i % 2 === 0 ? 'bold' : 'italic'
      );
    }
    expect(r.text.replace(/[^*]/g, '').length).toBeLessThanOrEqual(6);
  });

  it('caret inside bold span toggles bold off instead of inserting stars', () => {
    const src = '**hello**';
    // caret between l and l
    const r = applyMarkdownFormatAction(src, 4, 4, 'bold');
    expect(r.text).toBe('hello');
  });

  it('collapses already-stacked stars when toggling', () => {
    const stacked = '******hello******';
    const r = applyMarkdownFormatAction(stacked, 0, stacked.length, 'bold');
    // Peels stacked ** pairs down to plain (bold was on → off)
    expect(r.text).toBe('hello');
  });

  it('multi-line code action uses fenced pretty block', () => {
    const src = 'while (x) { int a = 1; }';
    // force multi-line selection path via embedded newline
    const multi = 'line1\n' + src;
    const r = applyMarkdownFormatAction(multi, 0, multi.length, 'code');
    expect(r.text.startsWith('```\n')).toBe(true);
    expect(r.text).toContain('int a = 1;');
  });

  it('single-line code action stays inline', () => {
    expect(applyMarkdownFormatAction('x', 0, 1, 'code').text).toBe('`x`');
  });
});

describe('fence toggle', () => {
  it('unwraps when selection is a full fence block', () => {
    const src = '```\ncode\n```';
    const r = fenceWrapPretty(src, 0, src.length);
    expect(r.text).toBe('code');
  });

  it('unwraps when selection is inner code with fence flanks', () => {
    const src = '```\ncode\n```';
    const innerStart = src.indexOf('code');
    const r = fenceWrapPretty(src, innerStart, innerStart + 4);
    expect(r.text).toBe('code');
  });

  it('tryUnfence returns null when not fenced', () => {
    expect(tryUnfence('plain', 0, 5)).toBeNull();
  });

  it('fence action twice returns to plain (no double fence)', () => {
    const once = applyMarkdownFormatAction('a();', 0, 4, 'fence');
    expect(once.text).toContain('```');
    const twice = applyMarkdownFormatAction(
      once.text,
      once.selStart,
      once.selEnd,
      'fence'
    );
    expect(twice.text).toBe('a();');
  });
});
