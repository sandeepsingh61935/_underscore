import { describe, expect, it } from 'vitest';

import { getModeBranding, MODE_BRANDING } from '@/shared/constants/mode-branding';

describe('mode-branding display names', () => {
  it('uses Guest / Account (Free) / Account (Paid)', () => {
    expect(MODE_BRANDING.basic.displayName).toBe('Guest');
    expect(MODE_BRANDING.pro.displayName).toBe('Account (Free)');
    expect(MODE_BRANDING.pro_xai.displayName).toBe('Account (Paid)');
  });

  it('getModeBranding returns the matrix entry', () => {
    expect(getModeBranding('pro_xai').tagline).toBe(MODE_BRANDING.pro_xai.tagline);
  });
});
