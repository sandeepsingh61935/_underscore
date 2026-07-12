/**
 * @file mode-capabilities.ts
 * @description Central feature gate for mode-boundary enforcement.
 * Single source for UI, IPC, and MCP to check capability + prerequisites.
 *
 * @see docs/04-adrs/025-mode-feature-boundaries.md
 */

import type { ModeCapabilities } from '@/content/modes/mode-interfaces';
import { AUTH_REQUIRED_MODES } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/** Boolean capability keys only (excludes persistence enum). */
export type FeatureKey = {
  [K in keyof ModeCapabilities]: ModeCapabilities[K] extends boolean ? K : never;
}[keyof ModeCapabilities];

export type FeatureDenyReason =
  | 'AUTH_REQUIRED'
  | 'CAPABILITY_DENIED'
  | 'WRONG_MODE'
  | 'WRONG_SCOPE';

export interface FeatureGateContext {
  mode: ModeType;
  capabilities: ModeCapabilities;
  isAuthenticated: boolean;
  storageScope?: 'basic' | 'pro';
}

export interface FeatureGateResult {
  allowed: boolean;
  reason?: FeatureDenyReason;
}

/** Static capability matrix — mirrors mode class declarations. */
export const MODE_CAPABILITY_MATRIX: Record<ModeType, ModeCapabilities> = {
  basic: {
    persistence: 'local',
    undo: true,
    sync: false,
    collections: true,
    tags: false,
    export: false,
    ai: false,
    search: false,
    multiSelector: false,
  },
  pro: {
    persistence: 'indexeddb',
    undo: true,
    sync: true,
    collections: true,
    tags: true,
    export: true,
    ai: false,
    search: true,
    multiSelector: true,
  },
  pro_xai: {
    persistence: 'indexeddb',
    undo: true,
    sync: true,
    collections: true,
    tags: true,
    export: true,
    ai: true,
    search: true,
    multiSelector: true,
  },
};

export function getCapabilitiesForMode(mode: ModeType): ModeCapabilities {
  return MODE_CAPABILITY_MATRIX[mode];
}

/**
 * Check whether a feature is allowed given mode capabilities and runtime prerequisites.
 */
/** Library reads require a signed-in account (offline session is sufficient). */
export function canAccessLibrary(isAuthenticated: boolean): boolean {
  return isAuthenticated;
}

export function canUseFeature(
  feature: FeatureKey,
  ctx: FeatureGateContext,
): FeatureGateResult {
  if (feature === 'ai' && ctx.mode !== 'pro_xai') {
    return { allowed: false, reason: 'WRONG_MODE' };
  }

  const cap = ctx.capabilities[feature];
  if (typeof cap === 'boolean' && !cap) {
    return { allowed: false, reason: 'CAPABILITY_DENIED' };
  }

  if (feature === 'collections' && !ctx.isAuthenticated) {
    return { allowed: false, reason: 'AUTH_REQUIRED' };
  }

  if (AUTH_REQUIRED_MODES.includes(ctx.mode) && !ctx.isAuthenticated) {
    return { allowed: false, reason: 'AUTH_REQUIRED' };
  }

  if (ctx.storageScope === 'basic' && proOnlyFeature(feature)) {
    return { allowed: false, reason: 'WRONG_SCOPE' };
  }

  return { allowed: true };
}

/**
 * Provider setup (API keys, model pickers, health checks).
 * Pro-family modes use persistent chrome.storage.local for API keys (plain text in extension sandbox).
 */
export function canConfigureAiProviders(ctx: FeatureGateContext): FeatureGateResult {
  if (ctx.mode !== 'pro_xai') {
    return { allowed: false, reason: 'WRONG_MODE' };
  }

  if (!ctx.capabilities.ai) {
    return { allowed: false, reason: 'CAPABILITY_DENIED' };
  }

  if (AUTH_REQUIRED_MODES.includes(ctx.mode) && !ctx.isAuthenticated) {
    return { allowed: false, reason: 'AUTH_REQUIRED' };
  }

  if (ctx.storageScope === 'basic' && proOnlyFeature('ai')) {
    return { allowed: false, reason: 'WRONG_SCOPE' };
  }

  return { allowed: true };
}

/** Features that require pro storage scope (signed-in cloud sync). */
function proOnlyFeature(feature: FeatureKey): boolean {
  return feature === 'sync' || feature === 'export' || feature === 'tags' || feature === 'search' || feature === 'ai';
}

export interface McpCapabilityFlags {
  sync: boolean;
  export: boolean;
  ai: boolean;
  collections: boolean;
  search: boolean;
  metadataWrite: boolean;
}

/** Build MCP session capability flags from the shared feature gate. */
export function buildMcpCapabilities(ctx: FeatureGateContext): McpCapabilityFlags {
  return {
    sync: canUseFeature('sync', ctx).allowed,
    export: canUseFeature('export', ctx).allowed,
    ai: canUseFeature('ai', ctx).allowed,
    collections: canUseFeature('collections', ctx).allowed,
    search: canUseFeature('search', ctx).allowed,
    metadataWrite: canUseFeature('tags', ctx).allowed,
  };
}
