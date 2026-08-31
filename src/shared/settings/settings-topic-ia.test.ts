import { describe, expect, it } from 'vitest';

import {
  resolveSettingsActionGates,
  settingsTopicsForSurface,
} from './settings-topic-ia';

describe('settingsTopicsForSurface', () => {
  it('popup includes Mode; web does not', () => {
    const popup = settingsTopicsForSurface('popup').map((t) => t.id);
    const web = settingsTopicsForSurface('web').map((t) => t.id);
    expect(popup).toContain('mode');
    expect(web).not.toContain('mode');
    expect(popup).toEqual(
      expect.arrayContaining(['account', 'plan', 'appearance', 'integrations', 'data'])
    );
  });
});

describe('resolveSettingsActionGates', () => {
  it('guest: no sync/export/mcp; popup can delete library', () => {
    const g = resolveSettingsActionGates({
      surface: 'popup',
      isAuthenticated: false,
      caps: {
        isGuest: true,
        isPastDue: false,
        flags: { sync: false, export: false, mcp: false },
      },
    });
    expect(g.canSync).toBe(false);
    expect(g.canExport).toBe(false);
    expect(g.canUseIntegrations).toBe(false);
    expect(g.canDeleteLibrary).toBe(true);
    expect(g.syncLockReason).toMatch(/Sign in/i);
  });

  it('paid free of past due: integrations on; web cannot delete library', () => {
    const g = resolveSettingsActionGates({
      surface: 'web',
      isAuthenticated: true,
      caps: {
        isGuest: false,
        isPastDue: false,
        flags: { sync: true, export: true, mcp: true },
      },
    });
    expect(g.canUseIntegrations).toBe(true);
    expect(g.canDeleteLibrary).toBe(false);
  });
});
