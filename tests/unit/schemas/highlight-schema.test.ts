import { describe, it, expect } from 'vitest';

import { TextQuoteSelectorSchema } from '@/shared/schemas/highlight-schema';

describe('Highlight Schema Regression Tests', () => {
  describe('TextQuoteSelectorSchema', () => {
    it('should allow exact match without prefix or suffix (Whole Block support)', () => {
      // This represents a "whole block" highlight where no sibling context exists
      const validSelector = {
        type: 'TextQuoteSelector',
        exact: 'This is a complete paragraph of text that was selected in its entirety.',
        // prefix: undefined,
        // suffix: undefined
      };

      const result = TextQuoteSelectorSchema.safeParse(validSelector);
      expect(result.success).toBe(true);
    });

    it('should still allow matches with context', () => {
      const validSelector = {
        type: 'TextQuoteSelector',
        exact: 'highlighted',
        prefix: 'pre context ',
        suffix: ' post context',
      };

      const result = TextQuoteSelectorSchema.safeParse(validSelector);
      expect(result.success).toBe(true);
    });

    it('should validate exact text length', () => {
      const invalidSelector = {
        type: 'TextQuoteSelector',
        exact: '', // Empty
      };

      const result = TextQuoteSelectorSchema.safeParse(invalidSelector);
      expect(result.success).toBe(false);
    });
  });
});
