/**
 * @file useModeFeature.ts
 * @description React adapter for the mode feature gate.
 * Composes mode, auth, and vault-lock context then delegates to canUseFeature.
 *
 * @see docs/implementation-plans/mode-boundary/prd-foundation.md
 */

import { useMemo } from 'react';

import { useVaultLocked } from '@/features/collections/hooks/use-vault-locked';
import {
  canUseFeature,
  getCapabilitiesForMode,
  type FeatureDenyReason,
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
 * Vault lock defaults to unlocked when the vault hook is unavailable (guest).
 */
export function useModeFeature(
  feature: FeatureKey,
  isAuthenticated: boolean,
): ModeFeatureResult {
  const { currentMode } = usePersistedMode(isAuthenticated);
  const vaultLocked = useVaultLocked(isAuthenticated);
  const capabilities = getCapabilitiesForMode(currentMode);
  const storageScope = isAuthenticated ? 'pro' : 'basic';

  return useMemo(
    () => {
      const gate = canUseFeature(feature, {
        mode: currentMode,
        capabilities,
        isAuthenticated,
        vaultLocked,
        storageScope,
      });

      return {
        allowed: gate.allowed,
        reason: gate.reason,
        capabilities,
      };
    },
    [feature, currentMode, capabilities, isAuthenticated, vaultLocked, storageScope],
  );
}
