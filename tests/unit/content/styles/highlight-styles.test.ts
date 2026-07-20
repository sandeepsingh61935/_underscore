/**
 * @file highlight-styles.test.ts
 * @description Color role / type resolution for paint (styles live in CSS file).
 */

import { describe, expect, it } from 'vitest';

import {
  getHighlightName,
  resolveColorRoleForPaint,
  resolveHighlightTypeForPaint,
} from '@/content/styles/highlight-styles';

describe('getHighlightName / resolveColorRoleForPaint', () => {
  it('builds semantic names from type + role', () => {
    expect(getHighlightName('underscore', 'yellow')).toBe('underscore-yellow');
    expect(getHighlightName('underscore', 'orange')).toBe('underscore-orange');
  });

  it('prefers colorRole over deprecated color', () => {
    expect(resolveColorRoleForPaint('blue', 'yellow')).toBe('blue');
    expect(resolveColorRoleForPaint(undefined, 'green')).toBe('green');
    expect(resolveColorRoleForPaint(undefined, undefined)).toBe('yellow');
  });

  it('falls back to yellow for legacy hex or unknown color strings', () => {
    expect(resolveColorRoleForPaint(undefined, '#FFEB3B')).toBe('yellow');
    expect(resolveColorRoleForPaint('not-a-role', undefined)).toBe('yellow');
  });

  it('defaults type to underscore', () => {
    expect(resolveHighlightTypeForPaint(undefined)).toBe('underscore');
    expect(resolveHighlightTypeForPaint('box')).toBe('box');
  });
});
