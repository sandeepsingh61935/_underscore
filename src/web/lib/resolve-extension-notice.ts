import {
  extensionMissingStripCopy,
  extensionRemnantCopy,
  guestInstalledShellCopy,
  mobileGuestCaptureCopy,
  type ExtensionNoticeCopy,
} from '@/shared/copy/product-surface-copy';
import type { ExtensionPresence } from '@/shared/extension/extension-presence';
import type { ExtensionNoticePrefs } from '@/web/lib/extension-notice-prefs';

export type ExtensionNoticeStripVariant =
  'missing-strip' | 'guest-signin' | 'mobile-guest';

export type ExtensionNoticeDismissKey = keyof ExtensionNoticePrefs;

export type ExtensionNoticeView =
  | { surface: 'none' }
  | {
      surface: 'strip';
      variant: ExtensionNoticeStripVariant;
      copy: ExtensionNoticeCopy;
      dismissKey: ExtensionNoticeDismissKey;
    }
  | {
      surface: 'remnant';
      copy: { label: string; href: string };
      dismissKey: 'missingCollapsed';
    };

export function resolveExtensionNotice(input: {
  presence: ExtensionPresence | null;
  isAuthenticated: boolean;
  isMobileViewport: boolean;
  prefs: ExtensionNoticePrefs;
}): ExtensionNoticeView {
  const { presence, isAuthenticated, isMobileViewport, prefs } = input;

  if (presence === null || presence === 'unknown') {
    return { surface: 'none' };
  }

  if (presence === 'installed') {
    if (isAuthenticated || prefs.guestSigninDismissed) {
      return { surface: 'none' };
    }
    return {
      surface: 'strip',
      variant: 'guest-signin',
      copy: guestInstalledShellCopy(),
      dismissKey: 'guestSigninDismissed',
    };
  }

  if (isMobileViewport) {
    if (isAuthenticated || prefs.mobileGuestDismissed) {
      return { surface: 'none' };
    }
    return {
      surface: 'strip',
      variant: 'mobile-guest',
      copy: mobileGuestCaptureCopy(),
      dismissKey: 'mobileGuestDismissed',
    };
  }

  if (prefs.missingCollapsed) {
    return {
      surface: 'remnant',
      copy: extensionRemnantCopy(),
      dismissKey: 'missingCollapsed',
    };
  }

  return {
    surface: 'strip',
    variant: 'missing-strip',
    copy: extensionMissingStripCopy({ guest: !isAuthenticated }),
    dismissKey: 'missingCollapsed',
  };
}
