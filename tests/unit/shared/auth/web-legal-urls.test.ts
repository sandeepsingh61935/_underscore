import { describe, expect, it, vi } from 'vitest';

import {
  getWebAppOrigin,
  openLegalDoc,
  resolveLegalDocUrl,
} from '@/shared/auth/web-legal-urls';

describe('web-legal-urls', () => {
  it('returns null origin when env is unset and window origin is not requested', () => {
    expect(getWebAppOrigin({ envOrigin: null, useWindowOrigin: false })).toBeNull();
  });

  it('normalizes env origin and builds legal URLs', () => {
    expect(getWebAppOrigin({ envOrigin: 'https://app.example.com/' })).toBe(
      'https://app.example.com'
    );
    expect(resolveLegalDocUrl('/privacy', { envOrigin: 'https://app.example.com' })).toBe(
      'https://app.example.com/privacy'
    );
    expect(resolveLegalDocUrl('/terms', { envOrigin: 'https://app.example.com' })).toBe(
      'https://app.example.com/terms'
    );
  });

  it('openLegalDoc is a no-op when origin is missing', () => {
    const openUrl = vi.fn();
    expect(openLegalDoc('/privacy', { envOrigin: null, openUrl })).toBe(false);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('openLegalDoc opens absolute URL when origin is configured', () => {
    const openUrl = vi.fn();
    expect(
      openLegalDoc('/terms', { envOrigin: 'https://app.example.com', openUrl })
    ).toBe(true);
    expect(openUrl).toHaveBeenCalledWith('https://app.example.com/terms');
  });
});
