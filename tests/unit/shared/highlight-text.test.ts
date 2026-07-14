import { describe, expect, it } from 'vitest';

import {
  HIGHLIGHT_TEXT_MAX_LENGTH,
  validateHighlightText,
} from '@/shared/utils/highlight-text';

describe('validateHighlightText', () => {
  it('accepts non-empty markdown body', () => {
    const result = validateHighlightText('**hello**\n\n```\ncode\n```');
    expect(result).toEqual({ ok: true, text: '**hello**\n\n```\ncode\n```' });
  });

  it('rejects empty / whitespace-only', () => {
    expect(validateHighlightText('   ').ok).toBe(false);
    expect(validateHighlightText('').ok).toBe(false);
  });

  it('trims trailing whitespace only', () => {
    const result = validateHighlightText('  indent kept\n');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe('  indent kept');
    }
  });

  it('rejects oversize text', () => {
    const result = validateHighlightText('x'.repeat(HIGHLIGHT_TEXT_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
  });
});
