import { describe, expect, it } from 'vitest';

import { DEFAULT_EXTENSION_NOTICE_PREFS } from './extension-notice-prefs';
import { resolveExtensionNotice } from './resolve-extension-notice';

const base = {
  isAuthenticated: false,
  isMobileViewport: false,
  prefs: { ...DEFAULT_EXTENSION_NOTICE_PREFS },
};

describe('resolveExtensionNotice', () => {
  it('shows nothing while presence is unknown or unset', () => {
    expect(
      resolveExtensionNotice({ ...base, presence: null }).surface
    ).toBe('none');
    expect(
      resolveExtensionNotice({ ...base, presence: 'unknown' }).surface
    ).toBe('none');
  });

  it('desktop missing → strip, or remnant when collapsed', () => {
    const strip = resolveExtensionNotice({ ...base, presence: 'missing' });
    expect(strip).toMatchObject({
      surface: 'strip',
      variant: 'missing-strip',
      dismissKey: 'missingCollapsed',
    });

    const remnant = resolveExtensionNotice({
      ...base,
      presence: 'missing',
      prefs: { ...base.prefs, missingCollapsed: true },
    });
    expect(remnant).toMatchObject({
      surface: 'remnant',
      dismissKey: 'missingCollapsed',
    });
  });

  it('signed-in desktop missing still shows capture strip', () => {
    const view = resolveExtensionNotice({
      ...base,
      presence: 'missing',
      isAuthenticated: true,
    });
    expect(view).toMatchObject({ surface: 'strip', variant: 'missing-strip' });
    if (view.surface === 'strip') {
      expect(view.copy.signInLabel).toBeUndefined();
    }
  });

  it('guest + installed → sign-in line, unless dismissed', () => {
    expect(
      resolveExtensionNotice({ ...base, presence: 'installed' })
    ).toMatchObject({
      surface: 'strip',
      variant: 'guest-signin',
      dismissKey: 'guestSigninDismissed',
    });
    expect(
      resolveExtensionNotice({
        ...base,
        presence: 'installed',
        prefs: { ...base.prefs, guestSigninDismissed: true },
      }).surface
    ).toBe('none');
    expect(
      resolveExtensionNotice({
        ...base,
        presence: 'installed',
        isAuthenticated: true,
      }).surface
    ).toBe('none');
  });

  it('mobile signed-in missing → no install nag', () => {
    expect(
      resolveExtensionNotice({
        ...base,
        presence: 'missing',
        isAuthenticated: true,
        isMobileViewport: true,
      }).surface
    ).toBe('none');
  });

  it('mobile guest missing → honest line, unless dismissed', () => {
    expect(
      resolveExtensionNotice({
        ...base,
        presence: 'missing',
        isMobileViewport: true,
      })
    ).toMatchObject({
      surface: 'strip',
      variant: 'mobile-guest',
      dismissKey: 'mobileGuestDismissed',
    });
    expect(
      resolveExtensionNotice({
        ...base,
        presence: 'missing',
        isMobileViewport: true,
        prefs: { ...base.prefs, mobileGuestDismissed: true },
      }).surface
    ).toBe('none');
  });
});
