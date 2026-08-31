export type SettingsTab = 'account' | 'plan' | 'appearance' | 'keyboard' | 'ai' | 'data';

const VALID_TABS: readonly SettingsTab[] = [
  'account',
  'plan',
  'appearance',
  'keyboard',
  'ai',
  'data',
] as const;

function isSettingsTab(value: string): value is SettingsTab {
  return (VALID_TABS as readonly string[]).includes(value);
}

/**
 * Parse settings tab from a URL search string (with or without leading `?`).
 * Invalid or missing tab defaults to `account`.
 */
export function parseSettingsTab(search: string): SettingsTab {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalized);
  const tab = params.get('tab');
  if (tab && isSettingsTab(tab)) {
    return tab;
  }
  return 'account';
}

/**
 * Build a search string for settings tab (no leading `?`) for navigate({ search }).
 */
export function buildSettingsSearch(tab: SettingsTab): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  return params.toString();
}
