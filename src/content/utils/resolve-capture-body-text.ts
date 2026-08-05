/**
 * Resolve library body text from a live Range at capture time.
 * Keeps the code-vs-prose policy in one place for create + redo paths.
 */

import {
  detectCodeSelectionMetadata,
  type CodeSelectionMeta,
} from '@/content/utils/code-selection-metadata';
import {
  normalizeCapturedHighlightText,
  softTrimCapturedText,
} from '@/shared/utils/normalize-captured-highlight-text';

export interface CaptureBodyResolution {
  text: string;
  codeMeta: CodeSelectionMeta | undefined;
}

/**
 * Body text for storage/display from a DOM selection range.
 * - Prose: Approach A normalize (collapse DOM indent / segment newlines)
 * - Code host (`pre`/`code`): soft-trim only (preserve internal indent)
 *
 * Does not mutate or replace TextQuote / serializeRange strings.
 */
export function resolveCaptureBodyText(range: Range): CaptureBodyResolution {
  const codeMeta = detectCodeSelectionMetadata(range);
  const rawText = range.toString();
  const text = codeMeta
    ? softTrimCapturedText(rawText)
    : normalizeCapturedHighlightText(rawText);
  return { text, codeMeta };
}
