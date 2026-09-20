/**
 * Per-browser chrome state for the extension setup notice.
 * One JSON blob (same pattern as webPrefs). Not an access token.
 */

export const EXT_NOTICE_PREFS_KEY = 'underscore.web.extNotice';

export type ExtensionNoticePrefs = {
  missingCollapsed: boolean;
  guestSigninDismissed: boolean;
  mobileGuestDismissed: boolean;
};

export const DEFAULT_EXTENSION_NOTICE_PREFS: ExtensionNoticePrefs = {
  missingCollapsed: false,
  guestSigninDismissed: false,
  mobileGuestDismissed: false,
};

function isBool(v: unknown): v is boolean {
  return v === true || v === false;
}

export function readExtensionNoticePrefs(): ExtensionNoticePrefs {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_EXTENSION_NOTICE_PREFS };
  }
  try {
    const raw = localStorage.getItem(EXT_NOTICE_PREFS_KEY);
    if (!raw) return { ...DEFAULT_EXTENSION_NOTICE_PREFS };
    const parsed = JSON.parse(raw) as Partial<ExtensionNoticePrefs>;
    return {
      missingCollapsed: isBool(parsed.missingCollapsed)
        ? parsed.missingCollapsed
        : DEFAULT_EXTENSION_NOTICE_PREFS.missingCollapsed,
      guestSigninDismissed: isBool(parsed.guestSigninDismissed)
        ? parsed.guestSigninDismissed
        : DEFAULT_EXTENSION_NOTICE_PREFS.guestSigninDismissed,
      mobileGuestDismissed: isBool(parsed.mobileGuestDismissed)
        ? parsed.mobileGuestDismissed
        : DEFAULT_EXTENSION_NOTICE_PREFS.mobileGuestDismissed,
    };
  } catch {
    return { ...DEFAULT_EXTENSION_NOTICE_PREFS };
  }
}

export function writeExtensionNoticePrefs(
  patch: Partial<ExtensionNoticePrefs>
): ExtensionNoticePrefs {
  const next: ExtensionNoticePrefs = {
    ...readExtensionNoticePrefs(),
    ...patch,
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(EXT_NOTICE_PREFS_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode
    }
  }
  return next;
}
