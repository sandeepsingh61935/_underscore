/**
 * @file usePersistedMode.ts
 * @description App-wide hook for persisting and syncing the active mode.
 *
 * Single source of truth for mode state across popup and content scripts.
 * - Reads initial value from chrome.storage.local on mount
 * - Writes on every change (optimistic update first)
 * - Broadcasts SET_MODE to content scripts on each persist
 * - Promotes basic → pro on login / session restore
 * - Projects pro_xai from billing entitlement (server truth)
 * - Reacts to external changes via chrome.storage.onChanged listener
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import {
    AUTH_REQUIRED_MODES,
    DEFAULT_MODE,
    MODE_STORAGE_KEY,
    VALID_MODES,
} from '@/shared/constants/mode-storage';
import { normalizeMode } from '@/shared/utils/normalize-mode';
import { broadcastModeToTabs } from '@/shared/services/broadcast-mode-to-tabs';
import {
    canSelectMode,
    freeEntitlement,
    projectModeFromEntitlement,
    type BillingEntitlement,
} from '@/shared/billing';
import { isBillingDevOverrideEnabled } from '@/shared/billing/dev-override';

function isChromeStorageAvailable(): boolean {
    return typeof chrome !== 'undefined'
        && typeof chrome.storage?.local?.get === 'function'
        && typeof chrome.storage?.onChanged?.addListener === 'function';
}

export interface UsePersistedModeOptions {
    /**
     * When ready, mode is projected from entitlement for signed-in users.
     * Omit during boot (billing not loaded yet).
     */
    entitlement?: BillingEntitlement;
    entitlementReady?: boolean;
}

export function usePersistedMode(
    isAuthenticated: boolean,
    options?: UsePersistedModeOptions
) {
    const [currentMode, setCurrentMode] = useState<ModeType>(DEFAULT_MODE);
    const [modeReady, setModeReady] = useState(false);

    const authRef = useRef(isAuthenticated);
    const wasAuthenticatedRef = useRef(isAuthenticated);
    const entitlementRef = useRef<BillingEntitlement>(
        options?.entitlement ?? freeEntitlement()
    );
    const entitlementReadyRef = useRef(Boolean(options?.entitlementReady));

    useEffect(() => {
        authRef.current = isAuthenticated;
    }, [isAuthenticated]);

    useEffect(() => {
        if (options?.entitlement) {
            entitlementRef.current = options.entitlement;
        }
        entitlementReadyRef.current = Boolean(options?.entitlementReady);
    }, [options?.entitlement, options?.entitlementReady]);

    const applyAndPersistMode = useCallback(async (mode: ModeType): Promise<void> => {
        if (!VALID_MODES.includes(mode)) return;
        if (!authRef.current && AUTH_REQUIRED_MODES.includes(mode)) return;
        if (authRef.current && mode === 'basic') return;

        // Gate Paid mode on server entitlement (unless local dev override)
        if (
            mode === 'pro_xai' &&
            !canSelectMode(mode, authRef.current, entitlementRef.current, {
                allowDevOverride: isBillingDevOverrideEnabled(),
            })
        ) {
            return;
        }

        setCurrentMode(mode);

        if (!isChromeStorageAvailable()) {
            return;
        }

        try {
            await chrome.storage.local.set({ [MODE_STORAGE_KEY]: mode });
            await broadcastModeToTabs(mode, authRef.current);
        } catch (err) {
            console.error('[usePersistedMode] Failed to persist mode:', err);
        }
    }, []);

    // Initial read + external storage changes
    useEffect(() => {
        let mounted = true;

        if (!isChromeStorageAvailable()) {
            const resolved: ModeType = authRef.current ? 'pro' : DEFAULT_MODE;
            setCurrentMode(resolved);
            setModeReady(true);
            return () => {
                mounted = false;
            };
        }

        chrome.storage.local.get(MODE_STORAGE_KEY).then((data) => {
            if (!mounted) return;

            // Raw value may be a legacy (pre-v3) mode name; normalizeMode()
            // translates it to basic/pro/pro_xai (falls back to default).
            const saved = normalizeMode(data[MODE_STORAGE_KEY]);
            let resolved: ModeType = saved;

            if (!authRef.current && AUTH_REQUIRED_MODES.includes(saved)) {
                resolved = DEFAULT_MODE;
            }

            // Session restore: signed-in users should not stay on default basic
            if (authRef.current && resolved === 'basic') {
                resolved = 'pro';
                void applyAndPersistMode('pro');
            }

            // Drop unpaid pro_xai from storage until entitlement confirms paid
            // (entitlement projection effect will re-promote if paid)
            if (
                authRef.current &&
                resolved === 'pro_xai' &&
                entitlementReadyRef.current &&
                !entitlementRef.current.isPaidActive &&
                !isBillingDevOverrideEnabled()
            ) {
                resolved = 'pro';
                void applyAndPersistMode('pro');
            }

            setCurrentMode(resolved);
            setModeReady(true);
        }).catch(() => {
            if (mounted) setModeReady(true);
        });

        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ) => {
            if (area !== 'local' || !changes[MODE_STORAGE_KEY]) return;

            const newMode = normalizeMode(changes[MODE_STORAGE_KEY].newValue);
            if (!authRef.current && AUTH_REQUIRED_MODES.includes(newMode)) return;
            setCurrentMode(newMode);
        };

        chrome.storage.onChanged.addListener(listener);

        return () => {
            mounted = false;
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [applyAndPersistMode]);

    // Logout: downgrade auth-required modes to basic
    useEffect(() => {
        if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(currentMode)) {
            void applyAndPersistMode(DEFAULT_MODE);
        }
    }, [isAuthenticated, currentMode, applyAndPersistMode]);

    // Login: promote basic → pro
    useEffect(() => {
        const wasAuth = wasAuthenticatedRef.current;
        wasAuthenticatedRef.current = isAuthenticated;

        if (isAuthenticated && !wasAuth && currentMode === 'basic') {
            void applyAndPersistMode('pro');
        }
    }, [isAuthenticated, currentMode, applyAndPersistMode]);

    // Entitlement projection: server truth for Paid
    useEffect(() => {
        if (!options?.entitlementReady || !isAuthenticated) return;
        if (isBillingDevOverrideEnabled()) return;

        const projected = projectModeFromEntitlement(
            isAuthenticated,
            options.entitlement ?? freeEntitlement()
        );

        if (projected !== currentMode) {
            // Only auto-move between pro <-> pro_xai (never force basic while signed in)
            if (
                (currentMode === 'pro' || currentMode === 'pro_xai') &&
                (projected === 'pro' || projected === 'pro_xai')
            ) {
                void applyAndPersistMode(projected);
            }
        }
    }, [
        options?.entitlementReady,
        options?.entitlement,
        isAuthenticated,
        currentMode,
        applyAndPersistMode,
    ]);

    const persistMode = useCallback(
        async (mode: ModeType): Promise<void> => {
            await applyAndPersistMode(mode);
        },
        [applyAndPersistMode]
    );

    return { currentMode, modeReady, persistMode };
}
