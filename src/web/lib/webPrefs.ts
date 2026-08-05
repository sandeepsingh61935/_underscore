/**
 * Web product preferences (localStorage). Density + future UI prefs.
 * Key: underscore.web.prefs
 */

export const WEB_PREFS_KEY = 'underscore.web.prefs';

export type WebDensity = 'compact' | 'comfortable' | 'roomy';

export type WebPrefs = {
  density: WebDensity;
};

const DEFAULT_PREFS: WebPrefs = {
  density: 'comfortable',
};

function isDensity(v: unknown): v is WebDensity {
  return v === 'compact' || v === 'comfortable' || v === 'roomy';
}

export function readWebPrefs(): WebPrefs {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(WEB_PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<WebPrefs>;
    return {
      density: isDensity(parsed.density) ? parsed.density : DEFAULT_PREFS.density,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeWebPrefs(patch: Partial<WebPrefs>): WebPrefs {
  const next: WebPrefs = { ...readWebPrefs(), ...patch };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(WEB_PREFS_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode
    }
  }
  applyWebPrefs(next);
  return next;
}

/** Apply density (and future prefs) to document root. */
export function applyWebPrefs(prefs: WebPrefs = readWebPrefs()): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset['density'] = prefs.density;
}
