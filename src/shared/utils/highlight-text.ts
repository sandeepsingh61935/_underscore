/**
 * Validation helpers for curated highlight body text (markdown source).
 */

/** Matches HighlightDataSchemaV2.text max length. */
export const HIGHLIGHT_TEXT_MAX_LENGTH = 10000;

export type HighlightTextValidation =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Normalize and validate highlight body text before persist.
 * Trims trailing whitespace only (leading intentional indent in fences kept via trimEnd).
 */
export function validateHighlightText(raw: string): HighlightTextValidation {
  const text = raw.trimEnd();
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Highlight text cannot be empty' };
  }
  if (text.length > HIGHLIGHT_TEXT_MAX_LENGTH) {
    return { ok: false, error: `Highlight text too long (max ${HIGHLIGHT_TEXT_MAX_LENGTH} characters)` };
  }
  return { ok: true, text };
}
