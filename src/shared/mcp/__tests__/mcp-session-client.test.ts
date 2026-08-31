import { describe, expect, it } from 'vitest';

import { parseMcpLastSuccessAt } from '../mcp-session-client';

describe('parseMcpLastSuccessAt', () => {
  it('parses ISO timestamps and rejects junk', () => {
    expect(parseMcpLastSuccessAt('2026-08-13T00:00:00.000Z')).toBe(
      Date.parse('2026-08-13T00:00:00.000Z')
    );
    expect(parseMcpLastSuccessAt(null)).toBeNull();
    expect(parseMcpLastSuccessAt('nope')).toBeNull();
  });
});
