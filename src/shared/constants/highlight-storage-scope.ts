/** Legacy single-store database (pre-isolation). Migrated into Basic on first boot. */
export const LEGACY_HIGHLIGHT_DB_NAME = 'underscore_vault';

/** Guest / Basic-mode highlight storage (logged out). */
export const BASIC_HIGHLIGHT_DB_NAME = 'underscore_basic';

/** Account offline cache (Pro / Pro-xAI while signed in). */
export const PRO_HIGHLIGHT_DB_NAME = 'underscore_pro';

export type HighlightStorageScope = 'basic' | 'pro';
