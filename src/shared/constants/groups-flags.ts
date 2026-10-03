/**
 * @file groups-flags.ts
 * @description Feature flags and kill switches for page groups functionality.
 */

/**
 * Kill switch for Phase 3 browser tab-group mirroring.
 * When true, Underscore allows groups to mirror browser tab groups in supported browsers.
 * Set to false to instantly disable tab-group synchronization across the extension.
 */
export const GROUPS_BROWSER_SYNC_ENABLED = true;
