/**
 * Pure markdown wrap helpers for highlight body editor shortcuts.
 * @see docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
 */

export interface WrapResult {
  text: string;
  selStart: number;
  selEnd: number;
}

/**
 * Wrap selection (or insert empty markers when start === end).
 * Empty selection: cursor sits between before and after.
 * Non-empty: selection remains on the inner content.
 */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
): WrapResult {
  const s = Math.max(0, Math.min(start, end, text.length));
  const e = Math.max(0, Math.min(Math.max(start, end), text.length));
  if (s === e) {
    const insert = `${before}${after}`;
    const next = text.slice(0, s) + insert + text.slice(e);
    const cursor = s + before.length;
    return { text: next, selStart: cursor, selEnd: cursor };
  }
  const selected = text.slice(s, e);
  const next = text.slice(0, s) + before + selected + after + text.slice(e);
  return {
    text: next,
    selStart: s + before.length,
    selEnd: s + before.length + selected.length,
  };
}

/**
 * Lightweight pretty-print: break on `{` `}` `;` and keep // comments on their line.
 * Skips when selection already has newlines with indentation.
 */
export function prettyPrintCode(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (s.includes('\n') && /^\s+/m.test(s)) return s;

  let out = '';
  let indent = 0;
  const pad = (): string => '  '.repeat(Math.max(0, indent));
  let i = 0;
  let line = '';

  const flush = (): void => {
    const t = line.trimEnd();
    if (t.trim().length > 0) {
      out += pad() + t.trimStart() + '\n';
    }
    line = '';
  };

  while (i < s.length) {
    if (s[i] === '/' && s[i + 1] === '/') {
      let j = i;
      while (j < s.length) {
        const rest = s.slice(j + 1);
        if (
          s[j] === ' ' &&
          /^(while|for|if|answer|int|auto|return)\b/.test(rest)
        ) {
          break;
        }
        if (s[j] === '{' || s[j] === '}' || s[j] === ';') break;
        j++;
      }
      line += s.slice(i, j);
      flush();
      i = j;
      continue;
    }

    const ch = s[i]!;
    if (ch === '{') {
      if (line.length > 0 && !/\s$/.test(line)) {
        line += ' ';
      }
      line += '{';
      flush();
      indent++;
      i++;
      continue;
    }
    if (ch === '}') {
      flush();
      indent = Math.max(0, indent - 1);
      out += pad() + '}\n';
      i++;
      continue;
    }
    if (ch === ';') {
      line += ';';
      flush();
      i++;
      continue;
    }
    line += ch;
    i++;
  }
  flush();
  const result = out.replace(/\n+$/, '').trimEnd();
  return result.length > 0 ? result : s;
}

/**
 * Fence-wrap selection with optional pretty-print of inner code.
 * Empty selection: insert empty fence pair, cursor on the inner blank line.
 */
export function fenceWrapPretty(
  text: string,
  start: number,
  end: number,
): WrapResult {
  const s = Math.max(0, Math.min(start, end, text.length));
  const e = Math.max(0, Math.min(Math.max(start, end), text.length));
  if (s === e) {
    const before = '```\n';
    const after = '\n```';
    const next = text.slice(0, s) + before + after + text.slice(e);
    const cursor = s + before.length;
    return { text: next, selStart: cursor, selEnd: cursor };
  }
  const selected = text.slice(s, e);
  const pretty = prettyPrintCode(selected);
  const block = '```\n' + pretty + '\n```';
  const next = text.slice(0, s) + block + text.slice(e);
  return {
    text: next,
    selStart: s,
    selEnd: s + block.length,
  };
}

/**
 * Apply Obsidian-style editor shortcut for a key chord.
 * Returns null when the event is not a handled shortcut.
 */
export function applyMarkdownShortcut(
  text: string,
  start: number,
  end: number,
  key: string,
  mods: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
): WrapResult | null {
  const mod = mods.metaKey || mods.ctrlKey;
  if (!mod) return null;
  const k = key.toLowerCase();
  if (k === 'b') return wrapSelection(text, start, end, '**', '**');
  if (k === 'i') return wrapSelection(text, start, end, '*', '*');
  if (k === 'e') return wrapSelection(text, start, end, '`', '`');
  if (k === 'c' && mods.shiftKey) return fenceWrapPretty(text, start, end);
  return null;
}
