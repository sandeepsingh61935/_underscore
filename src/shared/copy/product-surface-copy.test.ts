import { describe, expect, it } from 'vitest';

import {
  guestBannerCopy,
  guestLibraryLocalBannerCopy,
  homeFirstRunCopy,
  libraryEmptyGuestCopy,
  libraryNoMatchesCopy,
  productSurfaceCopyHasRetiredChat,
} from './product-surface-copy';

describe('product-surface-copy', () => {
  it('guest banner never mentions Chat or Ask', () => {
    const c = guestBannerCopy();
    expect(c.body).toMatch(/Local only/i);
    expect(c.body).toMatch(/sync/i);
    expect(c.signInLabel).toBe('Sign in');
    expect(productSurfaceCopyHasRetiredChat(c.body)).toBe(false);
  });

  it('guest library local banner matches web tone without AI/Chat', () => {
    const c = guestLibraryLocalBannerCopy();
    expect(c.body).toMatch(/Local only/i);
    expect(c.body).toMatch(/sync/i);
    expect(c.body).toMatch(/export/i);
    expect(productSurfaceCopyHasRetiredChat(c.body)).toBe(false);
    expect(c.body.toLowerCase()).not.toContain(' ai');
  });

  it('home first-run guest vs signed-in', () => {
    const guest = homeFirstRunCopy({ guest: true });
    expect(guest.title).toBe('No highlights yet');
    expect(guest.body).toMatch(/this device/i);
    expect(guest.signInLabel).toBe('Sign in to sync');

    const signedIn = homeFirstRunCopy({ guest: false });
    expect(signedIn.body).toMatch(/your library/i);
    expect(signedIn.signInLabel).toBeUndefined();
  });

  it('library empty guest includes capture path', () => {
    const c = libraryEmptyGuestCopy();
    expect(c.title).toBe('No highlights yet');
    expect(c.body).toMatch(/Highlight/i);
    expect(c.signInLabel).toBe('Sign in');
    expect(c.keyboardHint).toMatch(/⌘\+U|Ctrl\+U/);
    expect(c.keyboardHint).not.toMatch(/↩/);
  });

  it('no matches copy offers reset', () => {
    const c = libraryNoMatchesCopy();
    expect(c.title).toMatch(/No matches/i);
    expect(c.resetLabel).toBeTruthy();
  });
});
