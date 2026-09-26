/**
 * Short user-relayable error IDs (e.g. `err_8k2qx`).
 * Shown in place of raw error text at user surfaces; the full detail goes
 * to the logger / server sink keyed by this ID.
 */

export function newErrorId(): string {
  return `err_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
