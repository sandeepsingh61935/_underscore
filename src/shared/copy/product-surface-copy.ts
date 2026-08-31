/**
 * Cross-surface guest / empty / banner copy for popup + web.
 * No retired Chat/Ask product language.
 */

export type SurfaceCtaCopy = {
  body: string;
  signInLabel?: string;
};

export type FirstRunCopy = {
  title: string;
  body: string;
  signInLabel?: string;
  /** Web empty-state path to extension install hub. */
  installLabel?: string;
  installHref?: string;
};

export type LibraryEmptyGuestCopy = {
  title: string;
  body: string;
  signInLabel: string;
  keyboardHint: string;
  installLabel?: string;
  installHref?: string;
};

/** Web library empty when signed-in (or non-filtering empty). */
export type LibraryEmptyInstallCopy = {
  title: string;
  body: string;
  installLabel: string;
  installHref: string;
  signInLabel?: string;
};

export type NoMatchesCopy = {
  title: string;
  body: string;
  resetLabel: string;
};

/** True if string still advertises retired in-app Chat/Ask. */
export function productSurfaceCopyHasRetiredChat(text: string): boolean {
  return /\bchat\b|\bask (this |the )?library\b|\bask this page\b/i.test(text);
}

/** Web GuestBanner + popup guest strip. */
export function guestBannerCopy(): SurfaceCtaCopy {
  return {
    body: 'Highlights are stored locally. Sign in to sync, export, and connect Integrations.',
    signInLabel: 'Sign in',
  };
}

/**
 * Popup library when guest already has device-local highlights.
 * (Web guest library is always empty by architecture.)
 */
export function guestLibraryLocalBannerCopy(): SurfaceCtaCopy {
  return {
    body: 'Your highlights are saved on this device. Sign in to sync across devices and enable export.',
    signInLabel: 'Sign in',
  };
}

/** Popup / in-extension first-run (user already has the extension). */
export function homeFirstRunCopy(input: { guest: boolean }): FirstRunCopy {
  if (input.guest) {
    return {
      title: 'No highlights yet',
      body: 'Select text on any page and save a highlight. It will show up here.',
      signInLabel: 'Sign in to sync',
    };
  }
  return {
    title: 'No highlights yet',
    body: 'Select text on any page and save a highlight to fill your library.',
  };
}

/**
 * Web Home empty.
 * extensionInstalled: true → capture guidance (no Install CTA).
 * false/undefined → point at /install when extension is not known present.
 */
export function webHomeEmptyInstallCopy(input: {
  guest: boolean;
  extensionInstalled?: boolean;
}): FirstRunCopy {
  if (input.extensionInstalled) {
    if (input.guest) {
      return {
        title: 'No highlights yet',
        body: 'Select text on any page and save a highlight. It will show up here.',
        signInLabel: 'Sign in to sync',
      };
    }
    return {
      title: 'No highlights yet',
      body: 'Select text on any page and save a highlight to fill your library.',
    };
  }
  if (input.guest) {
    return {
      title: 'No highlights yet',
      body: 'Install the extension to capture text on pages. This library shows what you save.',
      signInLabel: 'Sign in to sync',
      installLabel: 'Install extension',
      installHref: '/install',
    };
  }
  return {
    title: 'No highlights yet',
    body: 'Install the extension (or open it) and highlight text on any page to fill this library.',
    installLabel: 'Install extension',
    installHref: '/install',
  };
}

/** Popup library empty (guest). Web library uses libraryEmptyInstallCopy. */
export function libraryEmptyGuestCopy(): LibraryEmptyGuestCopy {
  return {
    title: 'No highlights',
    body: 'Select text on any page — or sign in to load your cloud library.',
    signInLabel: 'Sign in',
    // Real chord is Ctrl/⌘+U (see shared/keyboard/shortcuts-table).
    keyboardHint:
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'Select text · press ⌘+U'
        : 'Select text · press Ctrl+U',
  };
}

/** Web library empty (not filtering) — guest vs signed-in; optional extension-aware. */
export function libraryEmptyInstallCopy(input: {
  guest: boolean;
  extensionInstalled?: boolean;
}): LibraryEmptyInstallCopy {
  if (input.extensionInstalled) {
    if (input.guest) {
      return {
        title: 'No highlights',
        body: 'Select text on a page and save a highlight — or sign in to load a cloud library.',
        installLabel: '',
        installHref: '',
        signInLabel: 'Sign in',
      };
    }
    return {
      title: 'No highlights',
      body: 'Select text on a page and save a highlight to fill this view.',
      installLabel: '',
      installHref: '',
    };
  }
  if (input.guest) {
    return {
      title: 'No highlights',
      body: 'Install the extension to capture text, or sign in to load a cloud library.',
      installLabel: 'Install extension',
      installHref: '/install',
      signInLabel: 'Sign in',
    };
  }
  return {
    title: 'No highlights',
    body: 'Capture text with the extension to fill this view.',
    installLabel: 'Install extension',
    installHref: '/install',
  };
}

export function libraryNoMatchesCopy(): NoMatchesCopy {
  return {
    title: 'No matches',
    body: 'Try a different query or clear filters.',
    resetLabel: 'Clear search',
  };
}
