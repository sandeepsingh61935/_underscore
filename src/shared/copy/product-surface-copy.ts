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
};

export type LibraryEmptyGuestCopy = {
  title: string;
  body: string;
  signInLabel: string;
  keyboardHint: string;
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
    body: 'Local only — sync, export, and Integrations after sign-in.',
    signInLabel: 'Sign in',
  };
}

/**
 * Popup library when guest already has device-local highlights.
 * (Web guest library is always empty by architecture.)
 */
export function guestLibraryLocalBannerCopy(): SurfaceCtaCopy {
  return {
    body: 'Local only. Sign in to sync across devices and unlock export.',
    signInLabel: 'Sign in',
  };
}

export function homeFirstRunCopy(input: { guest: boolean }): FirstRunCopy {
  if (input.guest) {
    return {
      title: 'No highlights yet',
      body: 'Select text on a page to save it on this device.',
      signInLabel: 'Sign in to sync',
    };
  }
  return {
    title: 'No highlights yet',
    body: 'Select text on a page to save it to your library.',
  };
}

export function libraryEmptyGuestCopy(): LibraryEmptyGuestCopy {
  return {
    title: 'No highlights yet',
    body: 'Read anything lately? Highlight a phrase to begin — or sign in to load your cloud library.',
    signInLabel: 'Sign in',
    keyboardHint: 'Select text · press ⌘↩',
  };
}

export function libraryNoMatchesCopy(): NoMatchesCopy {
  return {
    title: 'No matches',
    body: 'Try a different query or clear filters.',
    resetLabel: 'Clear search',
  };
}
