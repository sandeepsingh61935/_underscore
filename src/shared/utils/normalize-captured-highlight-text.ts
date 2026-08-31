/**
 * Normalize DOM-captured selection text into a readable library body.
 *
 * `Range.toString()` includes HTML source whitespace (indent text nodes) and
 * newlines between block segments. That body is rendered as markdown, so
 * accidental 4-space indents become CommonMark code blocks.
 *
 * Use only on fresh capture for the display/storage `text` field.
 * Do NOT apply to TextQuote `exact` / range serialization (re-anchor needs raw DOM text).
 * Do NOT apply when `sourceKind === 'code'` (preserve indent for code presentation).
 * Do NOT apply to user-edited markdown saves.
 */

/** Unicode spaces that appear in some UIs (NBSP, thin/ideographic spaces, ZWSP). */
const UNICODE_SPACE_RE = /[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g;

/** Horizontal whitespace to collapse after unicode mapping. */
const HORIZONTAL_WS_RE = /[ \t\f\v]+/g;

/**
 * True when the body already looks like intentional fenced markdown.
 * Fence-aware path leaves structure intact (trim ends only).
 */
export function looksLikeFencedMarkdown(raw: string): boolean {
  const s = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const trimmed = s.trim();
  if (/^```/.test(trimmed)) return true;
  // Opening or closing fence on its own line (with optional lang tag).
  return /(^|\n)```[\w+-]*[ \t]*(\n|$)/.test(s);
}

/**
 * Soft trim: drop leading/trailing newlines only (keep internal + first-line indent).
 * Used for code captures where internal formatting matters.
 */
export function softTrimCapturedText(raw: string): string {
  return String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

/**
 * Approach A: flatten DOM capture junk into one readable prose string.
 *
 * - Collapses HTML indent / multi-space / unicode spaces
 * - Joins segment lines with spaces (smart glue for leading punctuation)
 * - Drops empty lines (no paragraph retention — blank lines in pretty-printed
 *   transcript HTML are noise, not intentional paragraphs)
 * - Leaves fenced markdown mostly intact (ends only)
 */
export function normalizeCapturedHighlightText(raw: string): string {
  if (raw == null || raw === '') return '';

  const s = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (looksLikeFencedMarkdown(s)) {
    return softTrimCapturedText(s);
  }

  const lines = s
    .split('\n')
    .map((line) =>
      line.replace(UNICODE_SPACE_RE, ' ').replace(HORIZONTAL_WS_RE, ' ').trim()
    );
  const nonEmpty = lines.filter((line) => line.length > 0);

  let out = '';
  for (const line of nonEmpty) {
    if (!out) {
      out = line;
      continue;
    }
    // Segment boundaries often leave leading ", the…" — glue without a space.
    if (/^[,.;:!?…)]/.test(line)) {
      out += line;
    } else {
      out += ` ${line}`;
    }
  }

  return out.replace(/ {2,}/g, ' ').trim();
}
