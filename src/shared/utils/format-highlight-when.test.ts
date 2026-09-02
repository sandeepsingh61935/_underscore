import { describe, it, expect } from 'vitest';

import { formatHighlightWhen } from './format-highlight-when';

describe('formatHighlightWhen', () => {
  const now = Date.parse('2026-09-02T23:00:00.000Z');

  it('uses hours under 24h', () => {
    expect(formatHighlightWhen(now - 2 * 3600e3, now)).toBe('2h ago');
  });

  it('uses a calendar date after 24h', () => {
    const ts = Date.parse('2026-08-20T12:00:00.000Z');
    const label = formatHighlightWhen(ts, now);
    expect(label).not.toMatch(/ago/);
    expect(label.toLowerCase()).toMatch(/aug/);
  });

  it('promotes unix seconds so old stamps are not shown as hours', () => {
    const seconds = Date.parse('2026-08-01T00:00:00.000Z') / 1000;
    const label = formatHighlightWhen(seconds, now);
    expect(label).not.toMatch(/h ago/);
  });
});
