import { describe, it, expect } from 'vitest';

import {
  computeDomainOutputTokens,
  computeScopeQueryOutputTokens,
  computeSectionOutputTokens,
  MAX_OUTPUT_TOKENS,
} from '../summarization-tokens';

describe('summarization-tokens', () => {
  it('stays small for few highlights', () => {
    expect(computeSectionOutputTokens(1)).toBe(320);
    expect(computeSectionOutputTokens(3)).toBe(560);
  });

  it('scales up for moderate sections without hitting ceiling', () => {
    expect(computeSectionOutputTokens(11)).toBe(1520);
    expect(computeSectionOutputTokens(11)).toBeLessThan(MAX_OUTPUT_TOKENS);
  });

  it('respects length preference', () => {
    expect(computeSectionOutputTokens(11, 'short')).toBeLessThan(
      computeSectionOutputTokens(11, 'medium')
    );
    expect(computeSectionOutputTokens(11, 'long')).toBeGreaterThan(
      computeSectionOutputTokens(11, 'medium')
    );
  });

  it('caps at 16384 for very large jobs', () => {
    expect(computeSectionOutputTokens(200)).toBe(MAX_OUTPUT_TOKENS);
    expect(computeDomainOutputTokens(200, 30)).toBe(MAX_OUTPUT_TOKENS);
    expect(computeScopeQueryOutputTokens(320)).toBe(MAX_OUTPUT_TOKENS);
  });
});
