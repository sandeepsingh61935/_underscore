import { describe, expect, it } from 'vitest';

import type { PopupRouteInput } from '@/shared/popup/resolve-popup-initial-route';
import {
  postLoginViewForMode,
  resolvePopupInitialRoute,
} from '@/shared/popup/resolve-popup-initial-route';

function route(overrides: Partial<PopupRouteInput> = {}) {
  const base: PopupRouteInput = {
    isAuthenticated: false,
    onboarding: { hasSeenWelcome: true, hasSeenModeSelection: true },
    nav: {},
    currentMode: 'basic',
  };
  return resolvePopupInitialRoute({ ...base, ...overrides });
}

describe('resolvePopupInitialRoute', () => {
  it('routes first-time users to Welcome', () => {
    expect(
      route({ onboarding: { hasSeenWelcome: false, hasSeenModeSelection: false } }),
    ).toEqual({ view: 'WELCOME' });
  });

  it('routes authenticated users to Collections when last view was sign-in (legacy)', () => {
    expect(
      route({
        isAuthenticated: true,
        nav: { lastView: 'AUTH' },
      }),
    ).toEqual({ view: 'COLLECTIONS' });
  });

  it('routes authenticated users with pending Pro mode to Unlock Vault', () => {
    expect(
      route({
        isAuthenticated: true,
        nav: { pendingAuthMode: 'pro' },
      }),
    ).toEqual({
      view: 'UNLOCK_VAULT',
      applyMode: 'pro',
      consumePendingAuthMode: true,
    });
  });

  it('restores Settings for authenticated users', () => {
    expect(
      route({
        isAuthenticated: true,
        nav: { lastView: 'SETTINGS' },
      }),
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
      }),
    ).toEqual({
      view: 'SUB_DOMAIN',
      selectedDomain: 'example.com',
      selectedSection: 'docs',
    });
  });

  it('routes guests who have not picked a mode to Mode Selection', () => {
    expect(
      route({ onboarding: { hasSeenWelcome: true, hasSeenModeSelection: false } }),
    ).toEqual({ view: 'MODE_SELECTION' });
  });

  it('routes guests away from stale sign-in history to Collections', () => {
    expect(
      route({
        nav: { lastView: 'AUTH' },
      }),
    ).toEqual({ view: 'COLLECTIONS' });
  });

  it('restores Collections for guests when that was the last real screen', () => {
    expect(
      route({
        nav: { lastView: 'COLLECTIONS' },
      }),
    ).toEqual({ view: 'COLLECTIONS' });
  });
});

describe('postLoginViewForMode', () => {
  it('sends Basic users to Collections after sign-in', () => {
    expect(postLoginViewForMode('basic')).toBe('COLLECTIONS');
  });

  it('sends Pro users to Unlock Vault after sign-in', () => {
    expect(postLoginViewForMode('pro')).toBe('UNLOCK_VAULT');
    expect(postLoginViewForMode('pro_xai')).toBe('UNLOCK_VAULT');
  });
});
