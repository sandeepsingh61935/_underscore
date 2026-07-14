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
 * True when the code already looks intentionally formatted (multiple
 * indented lines). Soft-wrapped or single-newline captures should still
 * go through pretty-print.
 */
export function looksAlreadyPretty(raw: string): boolean {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 2) return false;
  const indented = lines.filter((line) => /^\s{2,}\S|^\t+\S/.test(line)).length;
  // At least two indented body lines, or braces already on their own lines.
  const braceLines = lines.filter((line) => /^\s*[{}]\s*$/.test(line)).length;
  return indented >= 2 || (indented >= 1 && braceLines >= 2);
}

/**
 * Collapse soft/capture newlines so brace/semicolon pretty-print can run.
 * Preserves intentional blank-line paragraph breaks as a single space join
 * of non-empty segments (code rarely needs blank lines mid-block).
 */
function flattenForPretty(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');
}

/**
 * Lightweight pretty-print for flattened C-family captures:
 * break on `{` `}` `;`, keep // comments on their own line, break before
 * common keywords glued after a comment or statement.
 */
export function prettyPrintCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (looksAlreadyPretty(trimmed)) return trimmed;

  // Always flatten first so soft-wrapped captures pretty-print reliably.
  const s = flattenForPretty(trimmed);

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

  /** Keywords that often start a new statement when glued after a comment. */
  const STMT_START =
    /^(while|for|if|else|do|switch|case|return|break|continue|answer|int|auto|void|bool|char|long|float|double|const|static|struct|class|public|private|protected|namespace|using|template|typename|std)\b/;

  while (i < s.length) {
    // Line comment
    if (s[i] === '/' && s[i + 1] === '/') {
      let j = i + 2;
      while (j < s.length) {
        if (s[j] === '{' || s[j] === '}' || s[j] === ';') break;
        // "semester answer++" / "only for (" — statement keyword after space
        if (s[j] === ' ' && STMT_START.test(s.slice(j + 1))) break;
        j++;
      }
      line += s.slice(i, j);
      flush();
      i = j;
      continue;
    }

    // Block comment /* ... */ — keep intact on current line
    if (s[i] === '/' && s[i + 1] === '*') {
      let j = i + 2;
      while (j < s.length - 1 && !(s[j] === '*' && s[j + 1] === '/')) j++;
      if (j < s.length - 1) j += 2;
      line += s.slice(i, j);
      i = j;
      continue;
    }

    // String / char literals — do not break inside
    if (s[i] === '"' || s[i] === "'") {
      const quote = s[i]!;
      let j = i + 1;
      while (j < s.length) {
        if (s[j] === '\\') {
          j += 2;
          continue;
        }
        if (s[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      line += s.slice(i, j);
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
      // Optional trailing semicolon after } (C++ class/struct)
      if (s[i] === ';') {
        out = out.replace(/\}\n$/, '};\n');
        i++;
      }
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
  return result.length > 0 ? result : trimmed;
}

/**
 * Fence-wrap selection with pretty-print of inner code.
 * Empty selection: insert empty fence pair, cursor on the inner blank line.
 *
 * Shortcut: Ctrl/Cmd+Shift+K (not Shift+C — Chrome steals that for Inspect).
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
 *
 * Fence + pretty: Ctrl/Cmd+Shift+K (and Ctrl/Cmd+Shift+C as alias when the
 * host does not steal it — e.g. some web contexts).
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
  if (k === 'b' && !mods.shiftKey) return wrapSelection(text, start, end, '**', '**');
  if (k === 'i' && !mods.shiftKey) return wrapSelection(text, start, end, '*', '*');
  if (k === 'e' && !mods.shiftKey) return wrapSelection(text, start, end, '`', '`');
  // Prefer K: Chrome extension + DevTools bind Ctrl+Shift+C to Inspect.
  if ((k === 'k' || k === 'c') && mods.shiftKey) return fenceWrapPretty(text, start, end);
  return null;
}
