/**
 * Pure markdown wrap helpers for highlight body editor shortcuts.
 * @see docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
 */

export interface WrapResult {
  text: string;
  selStart: number;
  selEnd: number;
}

function clampRange(text: string, start: number, end: number): { s: number; e: number } {
  const s = Math.max(0, Math.min(start, end, text.length));
  const e = Math.max(0, Math.min(Math.max(start, end), text.length));
  return { s, e };
}

/**
 * True when `selected` is wrapped by before/after.
 * Italic `*` must not claim bold `**...**` spans.
 */
export function isWrappedByMarkers(
  selected: string,
  before: string,
  after: string
): boolean {
  if (selected.length < before.length + after.length) return false;
  if (!selected.startsWith(before) || !selected.endsWith(after)) return false;
  // Italic must be single-star, not bold.
  if (before === '*' && after === '*') {
    if (selected.startsWith('**') && selected.endsWith('**')) return false;
  }
  // Bold must not unwrap a longer run of stars incorrectly — require exact ** edges.
  if (before === '**' && after === '**') {
    // Allow ***x*** as bold-wrapped outer; still starts/ends with **
    return true;
  }
  return true;
}

/**
 * Immediate flanking markers around [s,e), with italic/`*` not stealing bold `**`.
 */
export function hasFlankingMarkers(
  text: string,
  s: number,
  e: number,
  before: string,
  after: string
): boolean {
  if (s < before.length || e + after.length > text.length) return false;
  if (text.slice(s - before.length, s) !== before) return false;
  if (text.slice(e, e + after.length) !== after) return false;
  if (before === '*' && after === '*') {
    // Reject half of a bold pair: **inner** would look like * + * flanking.
    if (s >= 2 && text.slice(s - 2, s) === '**') return false;
    if (text.slice(e, e + 2) === '**') return false;
  }
  return true;
}

/**
 * Wrap selection (or insert empty markers when start === end).
 * Empty selection: cursor sits between before and after.
 * Non-empty: selection remains on the inner content.
 * Does not toggle — use toggleWrapSelection for editor tools.
 */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string
): WrapResult {
  const { s, e } = clampRange(text, start, end);
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
 * Toggle inline markers around the selection (for non-emphasis markers like `code`).
 * - Selection includes markers → unwrap inner
 * - Immediate flanking markers → unwrap
 * - Else wrap (empty selection inserts markers)
 *
 * For bold/italic stars use {@link toggleStarEmphasis} so styles compose
 * (`***x***`) instead of nesting forever (`**********x**********`).
 */
export function toggleWrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string
): WrapResult {
  const { s, e } = clampRange(text, start, end);

  // 1) Selection already includes the wrappers.
  if (s !== e) {
    const selected = text.slice(s, e);
    if (isWrappedByMarkers(selected, before, after)) {
      const inner = selected.slice(before.length, selected.length - after.length);
      const next = text.slice(0, s) + inner + text.slice(e);
      return { text: next, selStart: s, selEnd: s + inner.length };
    }
  }

  // 2) Markers immediately outside the selection (or empty caret between them).
  if (hasFlankingMarkers(text, s, e, before, after)) {
    const wrapStart = s - before.length;
    const wrapEnd = e + after.length;
    const inner = text.slice(s, e);
    const next = text.slice(0, wrapStart) + inner + text.slice(wrapEnd);
    return {
      text: next,
      selStart: wrapStart,
      selEnd: wrapStart + inner.length,
    };
  }

  // 3) Apply wrap.
  return wrapSelection(text, s, e, before, after);
}

export interface StarEmphasisInfo {
  /** Inclusive start of outermost * markers (or selection if none). */
  wrapStart: number;
  /** Exclusive end of outermost * markers (or selection if none). */
  wrapEnd: number;
  /** Content with all peeled * emphasis removed. */
  inner: string;
  bold: boolean;
  italic: boolean;
}

function emphasisOpenLen(bold: boolean, italic: boolean): number {
  if (bold && italic) return 3;
  if (bold) return 2;
  if (italic) return 1;
  return 0;
}

/** Render inner text with at most one combined * emphasis form. */
export function renderStarEmphasis(
  inner: string,
  bold: boolean,
  italic: boolean
): string {
  if (bold && italic) return `***${inner}***`;
  if (bold) return `**${inner}**`;
  if (italic) return `*${inner}*`;
  return inner;
}

/** Count consecutive `*` ending just before `index` (looking left). */
function starRunLeft(text: string, index: number): number {
  let n = 0;
  let i = index - 1;
  while (i >= 0 && text[i] === '*') {
    n++;
    i--;
  }
  return n;
}

/** Count consecutive `*` starting at `index` (looking right). */
function starRunRight(text: string, index: number): number {
  let n = 0;
  let i = index;
  while (i < text.length && text[i] === '*') {
    n++;
    i++;
  }
  return n;
}

/**
 * Map a delimiter-run length to bold/italic flags.
 * Collapses stacks from alternate toggles: 1=I, 2=B, 3=B+I, 4=B, 5=B+I, …
 */
export function flagsFromStarCount(count: number): { bold: boolean; italic: boolean } {
  if (count <= 0) return { bold: false, italic: false };
  if (count === 1) return { bold: false, italic: true };
  // count >= 2: bold; odd counts also italic (*** / *****)
  return { bold: true, italic: count % 2 === 1 };
}

/**
 * Peel surrounding star runs (included in selection or immediate flanks)
 * into bold/italic flags. Collapses stacked stars from alternate toggles
 * into a single logical form (`*` / `**` / `***`).
 */
export function analyzeStarEmphasis(
  text: string,
  start: number,
  end: number
): StarEmphasisInfo {
  const { s, e } = clampRange(text, start, end);

  // Stars included at both edges of the selection.
  const includedLeft = starRunRight(text, s);
  const includedRight = starRunLeft(text, e);
  const included = Math.min(includedLeft, includedRight);

  if (included > 0 && e - s >= included * 2) {
    // Prefer consuming the full edge runs when they match (******hello******).
    const use = includedLeft === includedRight ? includedLeft : included;
    if (use > 0 && e - s >= use * 2) {
      const innerStart = s + use;
      const innerEnd = e - use;
      // Only treat as emphasis wrap when the remaining inner has no edge stars
      // OR we consumed equal runs (stacked wrap).
      if (innerStart <= innerEnd) {
        const flags = flagsFromStarCount(use);
        return {
          wrapStart: s,
          wrapEnd: e,
          inner: text.slice(innerStart, innerEnd),
          bold: flags.bold,
          italic: flags.italic,
        };
      }
    }
  }

  // Immediate flanking runs outside the selection.
  const flankLeft = starRunLeft(text, s);
  const flankRight = starRunRight(text, e);
  const flank = Math.min(flankLeft, flankRight);
  if (flank > 0) {
    const use = flankLeft === flankRight ? flankLeft : flank;
    if (use > 0) {
      const flags = flagsFromStarCount(use);
      return {
        wrapStart: s - use,
        wrapEnd: e + use,
        inner: text.slice(s, e),
        bold: flags.bold,
        italic: flags.italic,
      };
    }
  }

  return {
    wrapStart: s,
    wrapEnd: e,
    inner: text.slice(s, e),
    bold: false,
    italic: false,
  };
}

/**
 * When the caret sits inside plain content that is already star-wrapped
 * (`**hel|lo**`), expand to the content span so toggle peels styles instead
 * of inserting a new marker pair at the caret (which caused `*****` stacks).
 */
export function expandCaretIntoStarContent(
  text: string,
  caret: number
): { s: number; e: number } | null {
  const c = Math.max(0, Math.min(caret, text.length));

  // Already between empty markers: **|** or *|*
  if (
    hasFlankingMarkers(text, c, c, '**', '**') ||
    hasFlankingMarkers(text, c, c, '*', '*')
  ) {
    return { s: c, e: c };
  }

  let contentStart = c;
  while (
    contentStart > 0 &&
    text[contentStart - 1] !== '*' &&
    text[contentStart - 1] !== '\n'
  ) {
    contentStart--;
  }
  let contentEnd = c;
  while (
    contentEnd < text.length &&
    text[contentEnd] !== '*' &&
    text[contentEnd] !== '\n'
  ) {
    contentEnd++;
  }

  if (contentStart === contentEnd) return null;

  const probe = analyzeStarEmphasis(text, contentStart, contentEnd);
  if (probe.bold || probe.italic) {
    return { s: contentStart, e: contentEnd };
  }
  return null;
}

/**
 * Toggle bold or italic as style flags (re-render with `***` / `**` / `*`).
 * Alternate B/I never nests beyond a single combined form.
 */
export function toggleStarEmphasis(
  text: string,
  start: number,
  end: number,
  style: 'bold' | 'italic'
): WrapResult {
  let { s, e } = clampRange(text, start, end);

  // Lost selection / caret inside existing emphasis → expand before peel.
  if (s === e) {
    const expanded = expandCaretIntoStarContent(text, s);
    if (expanded) {
      s = expanded.s;
      e = expanded.e;
    }
  }

  const info = analyzeStarEmphasis(text, s, e);

  // Empty caret, no existing emphasis → insert empty markers (type inside).
  if (
    s === e &&
    !info.bold &&
    !info.italic &&
    info.inner.length === 0 &&
    info.wrapStart === s
  ) {
    const before = style === 'bold' ? '**' : '*';
    return wrapSelection(text, s, e, before, before);
  }

  const nextBold = style === 'bold' ? !info.bold : info.bold;
  const nextItalic = style === 'italic' ? !info.italic : info.italic;
  const marked = renderStarEmphasis(info.inner, nextBold, nextItalic);
  const next = text.slice(0, info.wrapStart) + marked + text.slice(info.wrapEnd);
  const open = emphasisOpenLen(nextBold, nextItalic);
  return {
    text: next,
    selStart: info.wrapStart + open,
    selEnd: info.wrapStart + open + info.inner.length,
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

const FENCE_BLOCK_RE = /^```[^\n]*\n([\s\S]*?)\n```$/;
const FENCE_OPEN_RE = /```[^\n]*\n$/;
const FENCE_CLOSE_RE = /^\n```/;

/**
 * If selection is a fenced block (or immediately inside one), unwrap to inner code.
 * Returns null when not fenced.
 */
export function tryUnfence(text: string, start: number, end: number): WrapResult | null {
  const { s, e } = clampRange(text, start, end);

  if (s !== e) {
    const selected = text.slice(s, e);
    const m = FENCE_BLOCK_RE.exec(selected);
    if (m) {
      const inner = m[1] ?? '';
      const next = text.slice(0, s) + inner + text.slice(e);
      return { text: next, selStart: s, selEnd: s + inner.length };
    }
  }

  const beforeChunk = text.slice(0, s);
  const afterChunk = text.slice(e);
  const open = FENCE_OPEN_RE.exec(beforeChunk);
  const close = FENCE_CLOSE_RE.exec(afterChunk);
  if (open && close) {
    const wrapStart = s - open[0].length;
    const wrapEnd = e + close[0].length;
    const inner = text.slice(s, e);
    const next = text.slice(0, wrapStart) + inner + text.slice(wrapEnd);
    return {
      text: next,
      selStart: wrapStart,
      selEnd: wrapStart + inner.length,
    };
  }

  return null;
}

/**
 * Fence-wrap selection with pretty-print of inner code.
 * Toggle: if already fenced (selection or immediate flanks), unwrap instead.
 * Empty selection: insert empty fence pair, cursor on the inner blank line.
 *
 * Shortcut: Ctrl/Cmd+Shift+K (not Shift+C — Chrome steals that for Inspect).
 */
export function fenceWrapPretty(text: string, start: number, end: number): WrapResult {
  const unfenced = tryUnfence(text, start, end);
  if (unfenced) return unfenced;

  const { s, e } = clampRange(text, start, end);
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

/** Expand selection to full line bounds (for list transforms). */
export function expandToLineBounds(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  const s = Math.max(0, Math.min(start, end, text.length));
  const e = Math.max(0, Math.min(Math.max(start, end), text.length));
  let lineStart = s;
  while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--;
  let lineEnd = e;
  // If caret sits at start of next line after a selection, do not include that line.
  if (lineEnd > lineStart && text[lineEnd - 1] === '\n') {
    // keep exclusive end on the newline after last selected line
  } else {
    while (lineEnd < text.length && text[lineEnd] !== '\n') lineEnd++;
  }
  return { start: lineStart, end: lineEnd };
}

function mapSelectedLines(
  text: string,
  start: number,
  end: number,
  mapLine: (line: string, index: number) => string
): WrapResult {
  const bounds = expandToLineBounds(text, start, end);
  const block = text.slice(bounds.start, bounds.end);
  const lines = block.length === 0 ? [''] : block.split('\n');
  // Trailing empty from split when block ends with newline — drop for mapping.
  const hadTrailingNl = block.endsWith('\n');
  const bodyLines =
    hadTrailingNl && lines.length > 0 && lines[lines.length - 1] === ''
      ? lines.slice(0, -1)
      : lines;
  const mapped = bodyLines.map((line, i) => mapLine(line, i));
  const joined = mapped.join('\n') + (hadTrailingNl ? '\n' : '');
  const next = text.slice(0, bounds.start) + joined + text.slice(bounds.end);
  return {
    text: next,
    selStart: bounds.start,
    selEnd: bounds.start + joined.length - (hadTrailingNl ? 1 : 0),
  };
}

const BULLET_RE = /^(\s*)([-*+] )(.*)$/;
const NUMBERED_RE = /^(\s*)(\d+\. )(.*)$/;

/** Toggle/apply `- ` bullets on selected lines (expands to full lines). */
export function applyBulletList(text: string, start: number, end: number): WrapResult {
  const bounds = expandToLineBounds(text, start, end);
  const block = text.slice(bounds.start, bounds.end);
  const lines = block.replace(/\n$/, '').split('\n');
  const allBulleted =
    lines.every((l) => l.trim() === '' || BULLET_RE.test(l) || NUMBERED_RE.test(l)) &&
    lines.some((l) => BULLET_RE.test(l) || NUMBERED_RE.test(l));

  return mapSelectedLines(text, start, end, (line) => {
    if (line.trim() === '') return line;
    if (allBulleted) {
      const m = BULLET_RE.exec(line) ?? NUMBERED_RE.exec(line);
      if (m) return `${m[1]}${m[3]}`;
      return line;
    }
    const num = NUMBERED_RE.exec(line);
    if (num) return `${num[1]}- ${num[3]}`;
    const bul = BULLET_RE.exec(line);
    if (bul) return line;
    const lead = /^(\s*)/.exec(line)?.[1] ?? '';
    const body = line.slice(lead.length);
    return `${lead}- ${body}`;
  });
}

/** Toggle/apply `1. ` numbered list on selected lines. */
export function applyNumberedList(text: string, start: number, end: number): WrapResult {
  const bounds = expandToLineBounds(text, start, end);
  const block = text.slice(bounds.start, bounds.end);
  const lines = block.replace(/\n$/, '').split('\n');
  const allNumbered =
    lines.every((l) => l.trim() === '' || NUMBERED_RE.test(l) || BULLET_RE.test(l)) &&
    lines.some((l) => NUMBERED_RE.test(l) || BULLET_RE.test(l));

  let n = 1;
  return mapSelectedLines(text, start, end, (line) => {
    if (line.trim() === '') return line;
    if (allNumbered) {
      const m = NUMBERED_RE.exec(line) ?? BULLET_RE.exec(line);
      if (m) return `${m[1]}${m[3]}`;
      return line;
    }
    const bul = BULLET_RE.exec(line);
    if (bul) {
      const out = `${bul[1]}${n}. ${bul[3]}`;
      n += 1;
      return out;
    }
    const num = NUMBERED_RE.exec(line);
    if (num) {
      const out = `${num[1]}${n}. ${num[3]}`;
      n += 1;
      return out;
    }
    const lead = /^(\s*)/.exec(line)?.[1] ?? '';
    const body = line.slice(lead.length);
    const out = `${lead}${n}. ${body}`;
    n += 1;
    return out;
  });
}

export type MarkdownFormatAction =
  'bold' | 'italic' | 'code' | 'bullets' | 'numbered' | 'fence';

/** Toolbar + shortcut shared path: apply a named format action to a selection. */
export function applyMarkdownFormatAction(
  text: string,
  start: number,
  end: number,
  action: MarkdownFormatAction
): WrapResult {
  const { s, e } = clampRange(text, start, end);
  switch (action) {
    case 'bold':
      return toggleStarEmphasis(text, s, e, 'bold');
    case 'italic':
      return toggleStarEmphasis(text, s, e, 'italic');
    case 'code': {
      // Multi-line → fenced code block + pretty-print; single line → inline `code`.
      const selected = text.slice(s, e);
      if (selected.includes('\n') || tryUnfence(text, s, e)) {
        return fenceWrapPretty(text, s, e);
      }
      return toggleWrapSelection(text, s, e, '`', '`');
    }
    case 'bullets':
      return applyBulletList(text, s, e);
    case 'numbered':
      return applyNumberedList(text, s, e);
    case 'fence':
      return fenceWrapPretty(text, s, e);
  }
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
  mods: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }
): WrapResult | null {
  const mod = mods.metaKey || mods.ctrlKey;
  if (!mod) return null;
  const k = key.toLowerCase();
  if (k === 'b' && !mods.shiftKey)
    return applyMarkdownFormatAction(text, start, end, 'bold');
  if (k === 'i' && !mods.shiftKey)
    return applyMarkdownFormatAction(text, start, end, 'italic');
  if (k === 'e' && !mods.shiftKey)
    return applyMarkdownFormatAction(text, start, end, 'code');
  // Prefer K: Chrome extension + DevTools bind Ctrl+Shift+C to Inspect.
  if ((k === 'k' || k === 'c') && mods.shiftKey) {
    return applyMarkdownFormatAction(text, start, end, 'fence');
  }
  return null;
}
