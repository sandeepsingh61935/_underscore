/**
 * Settings topic IA shared by web tabs and popup section nav.
 * Extension retains Mode as an extra topic.
 */

export type SettingsTopicId =
  'account' | 'mode' | 'plan' | 'appearance' | 'integrations' | 'data';

export type SettingsTopicDef = {
  id: SettingsTopicId;
  label: string;
  /** Popup shows mode; web does not. */
  surfaces: Array<'popup' | 'web'>;
};

export const SETTINGS_TOPICS: SettingsTopicDef[] = [
  { id: 'account', label: 'Account', surfaces: ['popup', 'web'] },
  { id: 'mode', label: 'Mode', surfaces: ['popup'] },
  { id: 'plan', label: 'Plan', surfaces: ['popup', 'web'] },
  { id: 'appearance', label: 'Appearance', surfaces: ['popup', 'web'] },
  { id: 'integrations', label: 'Integrations', surfaces: ['popup', 'web'] },
  { id: 'data', label: 'Data', surfaces: ['popup', 'web'] },
];

export function settingsTopicsForSurface(surface: 'popup' | 'web'): SettingsTopicDef[] {
  return SETTINGS_TOPICS.filter((t) => t.surfaces.includes(surface));
}

export type SettingsActionGates = {
  canSync: boolean;
  canExport: boolean;
  canUseIntegrations: boolean;
  canDeleteLibrary: boolean;
  syncLockReason?: string;
  exportLockReason?: string;
  integrationsLockReason?: string;
};

/**
 * Gate presentation for Settings Data / Integrations rows.
 * Caps come from resolveProductCaps; delete-library is extension-capable.
 */
export function resolveSettingsActionGates(input: {
  surface: 'popup' | 'web';
  isAuthenticated: boolean;
  caps: {
    flags: { sync: boolean; export: boolean; mcp: boolean };
    isGuest: boolean;
    isPastDue: boolean;
  };
}): SettingsActionGates {
  const { caps, surface, isAuthenticated } = input;
  const authLock = !isAuthenticated ? 'Sign in to use account features' : undefined;
  const pastDueLock = caps.isPastDue ? 'Fix billing to use Integrations' : undefined;

  return {
    canSync: caps.flags.sync,
    canExport: caps.flags.export,
    canUseIntegrations: caps.flags.mcp,
    canDeleteLibrary: surface === 'popup',
    syncLockReason: caps.flags.sync ? undefined : (authLock ?? 'Unavailable'),
    exportLockReason: caps.flags.export ? undefined : (authLock ?? 'Unavailable'),
    integrationsLockReason: caps.flags.mcp
      ? undefined
      : (pastDueLock ?? authLock ?? 'Available with Account (Paid)'),
  };
}
