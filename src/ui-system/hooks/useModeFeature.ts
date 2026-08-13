/**
 * @file useModeFeature.ts
 * @description React adapter for the mode feature gate.
 * Composes mode and auth context then delegates to canUseFeature.
 *
 * @see docs/implementation-plans/mode-boundary/prd-foundation.md
 */

import { useMemo } from 'react';

import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import {
  canConfigureAiProviders,
  canUseFeature,
  canUseMcp,
  getCapabilitiesForMode,
  type FeatureDenyReason,
  type FeatureGateContext,
  type FeatureKey,
} from '@/shared/utils/mode-capabilities';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';

export interface ModeFeatureResult {
  allowed: boolean;
  reason?: FeatureDenyReason;
  capabilities: ReturnType<typeof getCapabilitiesForMode>;
}

/**
 * Check whether the active mode allows a feature for the current session.
 */
function usePaidActive(isAuthenticated: boolean): boolean {
  const billing = useBillingContextOptional();
  return Boolean(isAuthenticated && billing?.snapshot.isPaidActive);
}

export function useModeFeature(
  feature: FeatureKey,
  isAuthenticated: boolean,
): ModeFeatureResult {
  const { currentMode } = usePersistedMode(isAuthenticated);
  const capabilities = getCapabilitiesForMode(currentMode);
  const storageScope = isAuthenticated ? 'pro' : 'basic';
  const isPaidActive = usePaidActive(isAuthenticated);

  return useMemo(
    () => {
      const ctx = buildGateContext(
        currentMode,
        capabilities,
        isAuthenticated,
        storageScope,
        isPaidActive,
      );
      const gate = canUseFeature(feature, ctx);

      return {
        allowed: gate.allowed,
        reason: gate.reason,
        capabilities,
      };
    },
    [feature, currentMode, capabilities, isAuthenticated, storageScope, isPaidActive],
  );
}

function buildGateContext(
  currentMode: ReturnType<typeof usePersistedMode>['currentMode'],
  capabilities: ReturnType<typeof getCapabilitiesForMode>,
  isAuthenticated: boolean,
  storageScope: 'basic' | 'pro',
  isPaidActive: boolean,
): FeatureGateContext {
  return {
    mode: currentMode,
    capabilities,
    isAuthenticated,
    storageScope,
    isPaidActive,
  };
}

/** Gate for AI provider setup only (Settings hub, API keys, model lists). */
export function useConfigureAiProvidersGate(isAuthenticated: boolean): ModeFeatureResult {
  const { currentMode } = usePersistedMode(isAuthenticated);
  const capabilities = getCapabilitiesForMode(currentMode);
  const storageScope = isAuthenticated ? 'pro' : 'basic';
  const isPaidActive = usePaidActive(isAuthenticated);

  return useMemo(
    () => {
      const ctx = buildGateContext(
        currentMode,
        capabilities,
        isAuthenticated,
        storageScope,
        isPaidActive,
      );
      const gate = canConfigureAiProviders(ctx);

      return {
        allowed: gate.allowed,
        reason: gate.reason,
        capabilities,
      };
    },
    [currentMode, capabilities, isAuthenticated, storageScope, isPaidActive],
  );
}

/** Gate for Cloud MCP + compat bridge (Account Paid only). */
export function useMcpGate(isAuthenticated: boolean): ModeFeatureResult {
  const { currentMode } = usePersistedMode(isAuthenticated);
  const capabilities = getCapabilitiesForMode(currentMode);
  const storageScope = isAuthenticated ? 'pro' : 'basic';
  const isPaidActive = usePaidActive(isAuthenticated);

  return useMemo(
    () => {
      const ctx = buildGateContext(
        currentMode,
        capabilities,
        isAuthenticated,
        storageScope,
        isPaidActive,
      );
      const gate = canUseMcp(ctx);

      return {
        allowed: gate.allowed,
        reason: gate.reason,
        capabilities,
      };
    },
    [currentMode, capabilities, isAuthenticated, storageScope, isPaidActive],
  );
}
