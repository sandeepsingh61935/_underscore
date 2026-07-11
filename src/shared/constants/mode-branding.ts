/**
 * @file mode-branding.ts
 * @description Display/marketing layer for modes, decoupled from internal IDs.
 *
 * Internal mode IDs ('basic' | 'pro' | 'pro_xai') are a stable code contract
 * used across DI, IPC, and storage. Marketing copy (display name, plan SKU)
 * can change at any time by editing this file only — no migration required.
 *
 * @see docs/04-adrs (Mode Consolidation ADR)
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

export interface ModeBranding {
  /** User-facing name shown in UI */
  displayName: string;
  /** Marketing/plan SKU identifier (billing, analytics) */
  planName: string;
  /** High-level grouping used for UI sectioning ("On this device" vs "In the cloud") */
  family: 'device' | 'cloud';
  /** Short tagline shown under the mode name */
  tagline: string;
  /** Longer description shown on mode selection cards */
  description: string;
}

export const MODE_BRANDING: Record<ModeType, ModeBranding> = {
  basic: {
    displayName: 'Basic',
    planName: 'underscore-basic',
    family: 'device',
    tagline: 'On this device',
    description: 'Highlights live on this device. Choose how long they stick around in Settings.',
  },
  pro: {
    displayName: 'Pro',
    planName: 'underscore_pro',
    family: 'cloud',
    tagline: 'Synced',
    description: 'Signed in. Synced across every device you use.',
  },
  pro_xai: {
    displayName: '10x-Pro',
    planName: 'pro-10x',
    family: 'cloud',
    tagline: 'Synced + AI',
    description: 'Everything in Pro, plus AI summaries, synthesis, and Q&A over your highlights.',
  },
};

export function getModeBranding(mode: ModeType): ModeBranding {
  return MODE_BRANDING[mode];
}
