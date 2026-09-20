import { describe, expect, it } from 'vitest';

import {
  extensionMissingStripCopy,
  extensionRemnantCopy,
  guestInstalledShellCopy,
  guestLibraryLocalBannerCopy,
  homeFirstRunCopy,
  libraryEmptyGuestCopy,
  libraryEmptyInstallCopy,
  libraryNoMatchesCopy,
  mobileGuestCaptureCopy,
  productSurfaceCopyHasRetiredChat,
  webHomeEmptyInstallCopy,
  welcomeContinueWithoutCopy,
} from './product-surface-copy';

describe('product-surface-copy', () => {
  it('guest library local banner matches web tone without AI/Chat', () => {
    const c = guestLibraryLocalBannerCopy();
    expect(c.body).toMatch(/sync/i);
    expect(c.body).toMatch(/export/i);
    expect(productSurfaceCopyHasRetiredChat(c.body)).toBe(false);
    expect(c.body.toLowerCase()).not.toContain(' ai');
  });

  it('home first-run guest vs signed-in stays capture-focused for popup', () => {
    const guest = homeFirstRunCopy({ guest: true });
    expect(guest.title).toBe('No highlights yet');
    expect(guest.body).toMatch(/save a highlight/i);
    expect(guest.signInLabel).toBe('Sign in to sync');
    expect(guest.installHref).toBeUndefined();

    const signedIn = homeFirstRunCopy({ guest: false });
    expect(signedIn.body).toMatch(/your library/i);
    expect(signedIn.signInLabel).toBeUndefined();
  });

  it('web home empty points at install hub when extension missing', () => {
    const guest = webHomeEmptyInstallCopy({ guest: true });
    expect(guest.body).toMatch(/extension/i);
    expect(guest.installHref).toBe('/install');
    expect(guest.installLabel).toMatch(/Install/i);

    const signedIn = webHomeEmptyInstallCopy({ guest: false });
    expect(signedIn.installHref).toBe('/install');
    expect(signedIn.signInLabel).toBeUndefined();
  });

  it('web home empty is capture-focused when extension installed', () => {
    const guest = webHomeEmptyInstallCopy({ guest: true, extensionInstalled: true });
    expect(guest.body).toMatch(/Select text/i);
    expect(guest.installHref).toBeUndefined();
    expect(guest.installLabel).toBeUndefined();
  });

  it('library empty guest includes capture path', () => {
    const c = libraryEmptyGuestCopy();
    expect(c.title).toBe('No highlights');
    expect(c.body).toMatch(/Select text/i);
    expect(c.signInLabel).toBe('Sign in');
    expect(c.keyboardHint).toMatch(/⌘\+U|Ctrl\+U/);
    expect(c.keyboardHint).not.toMatch(/↩/);
  });

  it('library empty install copy is role-aware', () => {
    const guest = libraryEmptyInstallCopy({ guest: true });
    expect(guest.installHref).toBe('/install');
    expect(guest.signInLabel).toBe('Sign in');
    expect(guest.body).toMatch(/extension/i);

    const signedIn = libraryEmptyInstallCopy({ guest: false });
    expect(signedIn.installHref).toBe('/install');
    expect(signedIn.signInLabel).toBeUndefined();
    expect(signedIn.body).toMatch(/extension/i);

    const withExt = libraryEmptyInstallCopy({ guest: true, extensionInstalled: true });
    expect(withExt.installHref).toBe('');
    expect(withExt.body).toMatch(/Select text/i);
  });

  it('no matches copy offers reset', () => {
    const c = libraryNoMatchesCopy();
    expect(c.title).toMatch(/No matches/i);
    expect(c.resetLabel).toBeTruthy();
  });

  it('extension missing strip is role-aware and never Chat/Ask', () => {
    const guest = extensionMissingStripCopy({ guest: true });
    expect(guest.body).toMatch(/Install the extension/i);
    expect(guest.body).toMatch(/sign in/i);
    expect(guest.installHref).toBe('/install');
    expect(guest.signInLabel).toBe('Sign in');
    expect(productSurfaceCopyHasRetiredChat(guest.body)).toBe(false);

    const signedIn = extensionMissingStripCopy({ guest: false });
    expect(signedIn.body).toBe(
      'Highlighting lives in the extension. This is your library.'
    );
    expect(signedIn.signInLabel).toBeUndefined();
    expect(signedIn.installLabel).toBe('Install');
  });

  it('remnant, guest-installed, mobile guest, and continue copy stay locked', () => {
    expect(extensionRemnantCopy()).toEqual({
      label: 'Install extension',
      href: '/install',
    });
    const guestInstalled = guestInstalledShellCopy();
    expect(guestInstalled.body).toMatch(/Guest captures stay in the extension/i);
    expect(guestInstalled.signInLabel).toBe('Sign in');
    expect(mobileGuestCaptureCopy().body).toMatch(/desktop Chrome or Firefox/i);
    expect(welcomeContinueWithoutCopy().label).toBe('Continue without installing');
  });
});
