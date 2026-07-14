/**
 * @file markdown-wrap.test.ts
 * @description Pure wrap / pretty-print helpers for highlight markdown editor.
 */
import { describe, expect, it } from 'vitest';

import {
  applyMarkdownShortcut,
  fenceWrapPretty,
  looksAlreadyPretty,
  prettyPrintCode,
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
      }),
    ).toBeNull();
  });
});
