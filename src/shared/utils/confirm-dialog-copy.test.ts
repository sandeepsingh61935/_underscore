import { describe, expect, it } from 'vitest';

import {
  deleteDomainCopy,
  deleteHighlightCopy,
  deleteLibraryCopy,
  deleteSectionCopy,
  discardEditsCopy,
  removeApiKeyCopy,
  signOutCopy,
} from './confirm-dialog-copy';

describe('confirm-dialog-copy', () => {
  it('delete domain names the domain and impact count', () => {
    const c = deleteDomainCopy('developer.mozilla.org', 12);
    expect(c.severity).toBe('danger');
    expect(c.title).toBe('Delete this domain?');
    expect(c.message).toContain('12 highlights');
    expect(c.message).toContain('developer.mozilla.org');
    expect(c.strongNames).toEqual(['developer.mozilla.org']);
    expect(c.note).toMatch(/cannot be undone/i);
    expect(c.confirmLabel).toBe('Delete permanently');
    expect(c.cancelLabel).toBe('Cancel');
  });

  it('delete domain singularizes one highlight', () => {
    const c = deleteDomainCopy('example.com', 1);
    expect(c.message).toContain('1 highlight');
    expect(c.message).not.toContain('1 highlights');
  });

  it('delete section names path and domain', () => {
    const c = deleteSectionCopy('developer.mozilla.org', '/en-US/docs/Web/CSS', 5);
    expect(c.severity).toBe('danger');
    expect(c.title).toBe('Delete this section?');
    expect(c.message).toContain('/en-US/docs/Web/CSS');
    expect(c.message).toContain('developer.mozilla.org');
    expect(c.strongNames).toEqual(['/en-US/docs/Web/CSS', 'developer.mozilla.org']);
  });

  it('delete section at root uses domain only', () => {
    const c = deleteSectionCopy('example.com', '/', 2);
    expect(c.message).toContain('example.com');
    expect(c.message).not.toContain(' in / ');
    expect(c.strongNames).toEqual(['example.com']);
  });

  it('delete highlight is short and proportional', () => {
    const c = deleteHighlightCopy();
    expect(c.severity).toBe('danger');
    expect(c.title).toBe('Delete this highlight?');
    expect(c.confirmLabel).toBe('Delete');
    expect(c.message).toMatch(/quote/i);
    expect(c.note).toMatch(/cannot be undone/i);
  });

  it('library delete guest vs signed-in copy differs', () => {
    const guest = deleteLibraryCopy(false);
    const signedIn = deleteLibraryCopy(true);
    expect(guest.severity).toBe('danger');
    expect(signedIn.severity).toBe('danger');
    expect(guest.message).toMatch(/guest/i);
    expect(guest.message).not.toMatch(/cloud/i);
    expect(signedIn.message).toMatch(/cloud/i);
    expect(signedIn.message).not.toMatch(/guest/i);
    expect(guest.title).toBe(signedIn.title);
  });

  it('sign out is caution and keeps local data framing', () => {
    const c = signOutCopy();
    expect(c.severity).toBe('caution');
    expect(c.title).toBe('Sign out?');
    expect(c.confirmLabel).toBe('Sign out');
    expect(c.cancelLabel).toBe('Stay signed in');
    expect(c.note).toMatch(/stay/i);
    expect(c.message).toMatch(/Guest/i);
  });

  it('remove API key names the provider', () => {
    const c = removeApiKeyCopy('Anthropic');
    expect(c.severity).toBe('caution');
    expect(c.title).toBe('Remove API key?');
    expect(c.message).toContain('Anthropic');
    expect(c.strongNames).toEqual(['Anthropic']);
    expect(c.confirmLabel).toBe('Remove key');
    expect(c.cancelLabel).toBe('Keep key');
  });

  it('discard edits is caution with keep-editing cancel', () => {
    const c = discardEditsCopy();
    expect(c.severity).toBe('caution');
    expect(c.title).toBe('Discard edits?');
    expect(c.cancelLabel).toBe('Keep editing');
    expect(c.confirmLabel).toBe('Discard');
  });
});
