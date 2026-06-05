/**
 * @file usePersistedMode.ts
 * @description App-wide hook for persisting and syncing the active mode.
 *
 * Single source of truth for mode state across all popup views.
 * - Reads initial value from chrome.storage.local on mount
 * - Writes on every change (optimistic update first)
 * - Reacts to external changes from Settings page or other popup windows
 *   via chrome.storage.onChanged listener
 */

import { useState, useEffect, useCallback } from 'react';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

const STORAGE_KEY = 'underscore-current-mode';
const DEFAULT_MODE: ModeType = 'ephemeral';
const VALID_MODES: ModeType[] = ['ephemeral', 'local', 'cloud', 'ai'];
const AUTH_REQUIRED_MODES: ModeType[] = ['cloud', 'ai'];

export function usePersistedMode(isAuthenticated: boolean) {
    const [currentMode, setCurrentMode] = useState<ModeType>(DEFAULT_MODE);
    const [modeReady, setModeReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        // 1. Read initial mode from chrome.storage.local
        chrome.storage.local.get(STORAGE_KEY).then(data => {
            if (!mounted) return;

            const saved = data[STORAGE_KEY] as ModeType | undefined;
            if (saved && VALID_MODES.includes(saved)) {
                // Auth guard: clamp auth-required modes if user is not logged in
                const clamped =
                    !isAuthenticated && AUTH_REQUIRED_MODES.includes(saved)
                        ? DEFAULT_MODE
                        : saved;
                setCurrentMode(clamped);
            }
            setModeReady(true);
        }).catch(() => {
            if (mounted) setModeReady(true); // Still mark ready on error
        });

        // 2. React to external changes (Settings page, another popup window)
        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ) => {
            if (area !== 'local' || !changes[STORAGE_KEY]) return;

            const newMode = changes[STORAGE_KEY].newValue as ModeType;
            if (VALID_MODES.includes(newMode)) {
                // Auth guard for incoming external changes too
                if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(newMode)) return;
                setCurrentMode(newMode);
            }
        };

        chrome.storage.onChanged.addListener(listener);

        return () => {
            mounted = false;
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [isAuthenticated]);

    /**
     * Persist a mode change. Updates state optimistically, then writes to storage.
     * Auth-required modes are silently blocked when user is not authenticated.
     */
    const persistMode = useCallback(async (mode: ModeType): Promise<void> => {
        if (!VALID_MODES.includes(mode)) return;
        if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) return;

        // Optimistic update
        setCurrentMode(mode);

        try {
            await chrome.storage.local.set({ [STORAGE_KEY]: mode });
        } catch (err) {
            console.error('[usePersistedMode] Failed to persist mode:', err);
            // State remains optimistically set — acceptable degradation
        }
    }, [isAuthenticated]);

    return { currentMode, modeReady, persistMode };
}
