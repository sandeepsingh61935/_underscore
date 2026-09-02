import { describe, it, expect } from 'vitest';

import { FAVICON_MAX_BYTES, selectCompressedFavicon } from './compress-favicon';

function buf(n: number): ArrayBuffer {
  return new ArrayBuffer(n);
}

describe('selectCompressedFavicon', () => {
  it('picks the smallest candidate under the 4KB cap', () => {
    const picked = selectCompressedFavicon([
      { mime: 'image/png', bytes: buf(3000) },
      { mime: 'image/webp', bytes: buf(800) },
    ]);
    expect(picked?.mime).toBe('image/webp');
    expect(picked?.bytes.byteLength).toBe(800);
  });

  it('drops payloads over the cap', () => {
    expect(
      selectCompressedFavicon([{ mime: 'image/png', bytes: buf(FAVICON_MAX_BYTES + 1) }])
    ).toBeNull();
  });

  it('ignores non-png/webp', () => {
    expect(
      selectCompressedFavicon([{ mime: 'image/x-icon', bytes: buf(200) }])
    ).toBeNull();
  });
});
