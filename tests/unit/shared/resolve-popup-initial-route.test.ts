import { describe, expect, it } from 'vitest';

import type { PopupRouteInput } from '@/shared/popup/resolve-popup-initial-route';
import {
  postLoginViewForMode,
  resolvePopupInitialRoute,
} from '@/shared/popup/resolve-popup-initial-route';

function route(overrides: Partial<PopupRouteInput> = {}) {
  const base: PopupRouteInput = {
    isAuthenticated: false,
    onboarding: { hasSeenWelcome: true },
    nav: {},
    currentMode: 'basic',
  };
  return resolvePopupInitialRoute({ ...base, ...overrides });
}

describe('resolvePopupInitialRoute', () => {
  it('routes first-time users to Welcome', () => {
    expect(route({ onboarding: { hasSeenWelcome: false } })).toEqual({ view: 'WELCOME' });
  });

  it('routes authenticated users to Collections when last view was sign-in (legacy)', () => {
    expect(
      route({
        isAuthenticated: true,
        nav: { lastView: 'AUTH' },
      })
    ).toEqual({ view: 'COLLECTIONS' });
  });

  it('routes authenticated users with pending Pro mode to Collections', () => {
    expect(
      route({
        isAuthenticated: true,
        nav: { pendingAuthMode: 'pro' },
      })
    ).toEqual({
      view: 'COLLECTIONS',
      applyMode: 'pro',
      consumePendingAuthMode: true,
    });
  });

  it('restores Settings for authenticated users', () => {
    expect(
      route({
        isAuthenticated: true,
        nav: { lastView: 'SETTINGS' },
      })
    ).toEqual({ view: 'SETTINGS' });
  });

  it('restores domain drill-down context for authenticated users', () => {
    expect(
      route({
        isAuthenticated: true,
        nav: {
          lastView: 'SUB_DOMAIN',
          lastDomain: 'example.com',
          lastSection: 'docs',
        },
      })
    ).toEqual({
      view: 'SUB_DOMAIN',
      selectedDomain: 'example.com',
      selectedSection: 'docs',
    });
  });

  it('routes guests with stale AUTH lastView to Collections', () => {
    expect(
      route({
        nav: { lastView: 'AUTH' },
      })
    ).toEqual({ view: 'COLLECTIONS' });
  });

  it('restores Collections for signed-out guests', () => {
    expect(
      route({
        nav: { lastView: 'COLLECTIONS' },
      })
    ).toEqual({ view: 'COLLECTIONS' });
  });

  it('restores domain drill-down for signed-out guests', () => {
    expect(
      route({
        nav: {
          lastView: 'DOMAIN_DETAILS',
          lastDomain: 'example.com',
        },
      })
    ).toEqual({
      view: 'DOMAIN_DETAILS',
      selectedDomain: 'example.com',
    });
  });

  it('defaults guests to Collections when no last view', () => {
    expect(route()).toEqual({ view: 'COLLECTIONS' });
  });

  it('routes unauthenticated users awaiting email verification to AUTH', () => {
    expect(
      route({
        verificationStatus: 'awaiting',
        nav: { lastView: 'COLLECTIONS' },
      })
    ).toEqual({ view: 'AUTH' });
  });

  it('does not route authenticated users to AUTH even if verificationStatus lingers as awaiting', () => {
    expect(
      route({
        isAuthenticated: true,
        verificationStatus: 'awaiting',
        nav: { lastView: 'SETTINGS' },
      })
    ).toEqual({ view: 'SETTINGS' });
  });

  it('resumes an interrupted sign-in (pendingAuthMode set, not yet authenticated) on AUTH', () => {
    expect(
      route({
        nav: { pendingAuthMode: 'pro' },
      })
    ).toEqual({ view: 'AUTH' });
  });
});

describe('postLoginViewForMode', () => {
  it('sends Basic users to Collections after sign-in', () => {
    expect(postLoginViewForMode('basic')).toBe('COLLECTIONS');
  });

  it('sends Pro users to Collections after sign-in', () => {
    expect(postLoginViewForMode('pro')).toBe('COLLECTIONS');
    expect(postLoginViewForMode('pro_xai')).toBe('COLLECTIONS');
  });
});
