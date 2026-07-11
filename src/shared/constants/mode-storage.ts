import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/** Canonical chrome.storage.local key for the active highlight mode (popup + content). */
export const MODE_STORAGE_KEY = 'underscore-current-mode';

/** Pre-v2 content-script key; read once at init then migrated to MODE_STORAGE_KEY. */
export const LEGACY_MODE_STORAGE_KEY = 'underscore_mode';

export const DEFAULT_MODE: ModeType = 'basic';

export const VALID_MODES: ModeType[] = ['basic', 'pro', 'pro_xai'];

export const AUTH_REQUIRED_MODES: ModeType[] = ['pro', 'pro_xai'];
