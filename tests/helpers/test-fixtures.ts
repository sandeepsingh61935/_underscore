/**
 * Test fixtures for creating test data
 *
 * Provides factory functions for generating valid test data
 */
import { v4 as uuid } from 'uuid';

import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';

export function createTestHighlight(
  overrides?: Partial<HighlightDataV2>
): HighlightDataV2 {
  const defaultRange: SerializedRange = {
    xpath: '//body/p[1]',
    startOffset: 0,
    endOffset: 10,
    text: 'Test highlight text',
    textBefore: '',
    textAfter: '',
    selector: {
      type: 'TextQuoteSelector',
      exact: 'Test highlight text',
      prefix: '',
      suffix: '',
    },
  };

  return {
    version: 2,
    id: uuid(),
    text: 'Test highlight text',
    contentHash: 'abc123def456',
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [defaultRange],
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestRange(text: string): SerializedRange {
  return {
    xpath: '//body/p[1]',
    startOffset: 0,
    endOffset: text.length,
    text,
    textBefore: '',
    textAfter: '',
    selector: {
      type: 'TextQuoteSelector',
      exact: text,
      prefix: '',
      suffix: '',
    },
  };
}
