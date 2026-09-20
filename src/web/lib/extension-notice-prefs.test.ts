import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_EXTENSION_NOTICE_PREFS,
  EXT_NOTICE_PREFS_KEY,
  readExtensionNoticePrefs,
  writeExtensionNoticePrefs,
} from './extension-notice-prefs';

describe('extension-notice-prefs', () => {
  afterEach(() => {
    localStorage.removeItem(EXT_NOTICE_PREFS_KEY);
  });

  it('defaults to all-false and patches one blob', () => {
    expect(readExtensionNoticePrefs()).toEqual(DEFAULT_EXTENSION_NOTICE_PREFS);
    const next = writeExtensionNoticePrefs({ missingCollapsed: true });
    expect(next.missingCollapsed).toBe(true);
    expect(next.guestSigninDismissed).toBe(false);
    expect(readExtensionNoticePrefs().missingCollapsed).toBe(true);

    writeExtensionNoticePrefs({ guestSigninDismissed: true });
    expect(readExtensionNoticePrefs()).toEqual({
      missingCollapsed: true,
      guestSigninDismissed: true,
      mobileGuestDismissed: false,
    });
  });
});
