import { describe, it, expect } from 'vitest';
import { generateHighlightId } from './generate-highlight-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateHighlightId', () => {
  it('returns a UUID v4 suitable for cloud highlights.id', () => {
    const id = generateHighlightId();
    expect(id).toMatch(UUID_V4);
  });

  it('returns unique ids on successive calls', () => {
    const a = generateHighlightId();
    const b = generateHighlightId();
    expect(a).not.toBe(b);
  });
});
