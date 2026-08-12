/**
 * 10x-Pro Mode (internal ID: pro_xai)
 *
 * Philosophy: Everything in Pro, plus AI-powered features layered on top.
 *
 * pro_xai is a capability overlay, not a separate persistence strategy —
 * highlight create/read/update/delete/restore all delegate to ProMode's
 * IndexedDB + sync implementation unchanged. The only difference is the
 * `name` identity and the `ai` / `mcp` capability flags, which the UI/feature
 * layer uses to gate AI affordances and Integrations.
 *
 * @see docs/04-adrs (Mode Consolidation ADR) — "ai has no registered
 * highlight mode" gap; pro_xai closes it by extending ProMode directly.
 */

import { ProMode } from './pro-mode';
import type { ModeCapabilities } from './mode-interfaces';

export class ProXaiMode extends ProMode {
  override get name(): 'pro_xai' {
    return 'pro_xai' as const;
  }

  override readonly capabilities: ModeCapabilities = {
    persistence: 'indexeddb',
    undo: true,
    sync: true,
    collections: true,
    tags: true,
    export: true,
    ai: true,
    mcp: true,
    search: true,
    multiSelector: true,
  };
}
