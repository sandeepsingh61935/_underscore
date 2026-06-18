/**
 * @file useUnlockVault.ts
 * @description User-facing vault unlock hook (ADR-018).
 *
 * Wraps the IPC_VAULT_UNLOCK channel that delegates to KeyManager.unlock()
 * (ADR-012). The popup is the only place that collects the user's passphrase;
 * the service worker is the only place that derives the master key, so this
 * hook is a thin transport layer.
 *
 * Per ADR-009: views never call chrome.runtime.sendMessage directly. This
 * hook is the canonical caller and tracks the in-flight state plus the
 * resulting vault status.
 */

import { useCallback, useState } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';

export type VaultStatus = 'unknown' | 'locked' | 'unlocked';

export interface UseUnlockVaultResult {
    /**
     * Send the user's passphrase to the background for key derivation.
     * Returns `{ success: true }` when the vault is unlocked, or
     * `{ success: false, error }` when the background reports a failure.
     */
    unlock: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
    /**
     * True while the IPC round-trip is in flight. Use to disable submit.
     */
    isUnlocking: boolean;
    /**
     * Last error from the background (null on success or before first call).
     */
    error: string | null;
    /**
     * 'unknown' before any unlock attempt, 'locked' after a failure or when
     * the extension context is unavailable, 'unlocked' after a successful
     * derivation.
     */
    vaultStatus: VaultStatus;
}

function hasChromeRuntime(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
}

/**
 * Hook: send the user's passphrase to KeyManager.unlock() via IPC.
 *
 * `vaultStatus` starts as 'unknown' (first-run, no signal). It transitions to
 * 'unlocked' on success and to 'locked' on any failure or when the chrome
 * runtime is missing (e.g. web app context).
 */
export function useUnlockVault(): UseUnlockVaultResult {
    const unlockAction = useIpcAction<{ passphrase: string }, { keyId: string }>('IPC_VAULT_UNLOCK');

    // Default to 'locked' in non-extension contexts (web app) so the UI does
    // not pretend the vault is in a fresh, unknown state.
    const [vaultStatus, setVaultStatus] = useState<VaultStatus>(() =>
        hasChromeRuntime() ? 'unknown' : 'locked'
    );
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const unlock = useCallback(async (passphrase: string) => {
        setIsUnlocking(true);
        setError(null);
        const result = await unlockAction({ passphrase });
        if (!result.success) {
            setVaultStatus('locked');
            setError(result.error);
            setIsUnlocking(false);
            return { success: false, error: result.error };
        }
        setVaultStatus('unlocked');
        setIsUnlocking(false);
        return { success: true };
    }, [unlockAction]);

    return { unlock, isUnlocking, error, vaultStatus };
}
