/**
 * @file useModeFeature.ts
 * @description React adapter for the mode feature gate.
 * Callers pass isPaidActive — this hook does not import billing.
 */

import { useMemo } from 'react';

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

export function useModeFeature(
  feature: FeatureKey,
  isAuthenticated: boolean,
  isPaidActive = false
): ModeFeatureResult {
  const { currentMode } = usePersistedMode(isAuthenticated);
  const capabilities = getCapabilitiesForMode(currentMode);
  const storageScope = isAuthenticated ? 'pro' : 'basic';

  return useMemo(() => {
    const ctx: FeatureGateContext = {
      mode: currentMode,
      capabilities,
      isAuthenticated,
      storageScope,
      isPaidActive,
    };
    const gate = canUseFeature(feature, ctx);
    return { allowed: gate.allowed, reason: gate.reason, capabilities };
  }, [feature, currentMode, capabilities, isAuthenticated, storageScope, isPaidActive]);
}

export function useConfigureAiProvidersGate(
  isAuthenticated: boolean,
  isPaidActive: boolean
): ModeFeatureResult {
  const { currentMode } = usePersistedMode(isAuthenticated);
  const capabilities = getCapabilitiesForMode(currentMode);
  return useMemo(() => {
    const gate = canConfigureAiProviders({ isAuthenticated, isPaidActive });
    return { allowed: gate.allowed, reason: gate.reason, capabilities };
  }, [currentMode, capabilities, isAuthenticated, isPaidActive]);
}

export function useMcpGate(
  isAuthenticated: boolean,
  isPaidActive: boolean,
  isPastDue = false
): ModeFeatureResult {
  const { currentMode } = usePersistedMode(isAuthenticated);
  const capabilities = getCapabilitiesForMode(currentMode);
  return useMemo(() => {
    const gate = canUseMcp({ isAuthenticated, isPaidActive, isPastDue });
    return { allowed: gate.allowed, reason: gate.reason, capabilities };
  }, [currentMode, capabilities, isAuthenticated, isPaidActive, isPastDue]);
}
