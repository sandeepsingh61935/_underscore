/**
 * @file text-fragment.test.ts
 * @description Unit tests for W3C Scroll-to-Text Fragment URL generator.
 */
import { describe, expect, it } from 'vitest';

import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';

describe('buildTextFragmentUrl', () => {
  it('encodes exact match text into W3C text directive', () => {
    const url = buildTextFragmentUrl('https://example.com/article', {
      exact: 'remarkable insight',
    });

    expect(url).toBe('https://example.com/article#:~:text=remarkable%20insight');
  });

  it('includes prefix and suffix for disambiguation', () => {
    const url = buildTextFragmentUrl('https://example.com/article', {
      exact: 'middle sentence',
      prefix: 'before context ',
      suffix: ' after context',
    });

    expect(url).toBe(
      'https://example.com/article#:~:text=before%20context%20-,middle%20sentence,-%20after%20context'
    );
  });

  it('escapes hyphens, commas, and ampersands per W3C text fragment spec', () => {
    const url = buildTextFragmentUrl('https://example.com/article', {
      exact: 'bread, butter & jam - delicious',
    });

    expect(url).toBe(
      'https://example.com/article#:~:text=bread%2C%20butter%20%26%20jam%20%2D%20delicious'
    );
  });

  it('splits long quotes into textStart,textEnd range when exceeding threshold', () => {
    const longQuote =
      'The architecture of complex systems reveals an undeniable truth: simplicity is not the absence of clutter, but the mastery of constraints across the entire domain lifecycle.';

    const url = buildTextFragmentUrl('https://example.com/article', {
      exact: longQuote,
      maxExactLength: 60,
    });

    // Should use textStart,textEnd format instead of huge string
    expect(url).toContain('#:~:text=');
    expect(url).not.toBe(
      `https://example.com/article#:~:text=${encodeURIComponent(longQuote)}`
    );
    expect(url).toMatch(
      /https:\/\/example\.com\/article#:~:text=The%20architecture%20of%20complex,the%20entire%20domain%20lifecycle\./
    );
  });

  it('preserves existing URL hash anchors and appends :~:text= directive', () => {
    const url = buildTextFragmentUrl('https://example.com/article#introduction', {
      exact: 'key takeaway',
    });

    expect(url).toBe('https://example.com/article#introduction:~:text=key%20takeaway');
  });

  it('returns baseUrl unchanged if exact text is empty or blank', () => {
    const url = buildTextFragmentUrl('https://example.com/article', {
      exact: '   ',
    });

    expect(url).toBe('https://example.com/article');
  });
});
