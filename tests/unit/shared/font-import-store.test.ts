import { describe, expect, it } from 'vitest';

import { validateFontFile } from '@/shared/services/font-import-store';

function makeFile(name: string, bytes: number[]): File {
  return new File([new Uint8Array(bytes)], name, { type: 'application/octet-stream' });
}

describe('font-import-store', () => {
  it('rejects files over 2 MB', async () => {
    const big = new Array(2 * 1024 * 1024 + 1).fill(0);
    const result = await validateFontFile(makeFile('big.woff2', big));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('2 MB');
    }
  });

  it('rejects unknown extensions without magic bytes', async () => {
    const result = await validateFontFile(makeFile('font.bin', [0, 0, 0, 0]));
    expect(result.valid).toBe(false);
  });

  it('accepts woff2 magic bytes', async () => {
    const bytes = [0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x02];
    const result = await validateFontFile(makeFile('custom.woff2', bytes));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.format).toBe('woff2');
      expect(result.familyName).toBe('custom');
    }
  });

  it('accepts ttf extension', async () => {
    const bytes = [0x00, 0x01, 0x00, 0x00, 0x00];
    const result = await validateFontFile(makeFile('MyFont.ttf', bytes));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.format).toBe('truetype');
      expect(result.familyName).toBe('MyFont');
    }
  });
});
