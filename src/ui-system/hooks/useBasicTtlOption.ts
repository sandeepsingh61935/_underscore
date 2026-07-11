/**
 * @file useBasicTtlOption.ts
 * @description Reactive read of the user's configured Basic mode TTL
 * preference (see @/shared/constants/basic-ttl).
 */

import { useEffect, useState } from 'react';
import {
    BASIC_TTL_DEFAULT,
    BASIC_TTL_STORAGE_KEY,
    basicTtlConfigToMs,
    getBasicTtlConfig,
    isBasicTtlConfig,
    type BasicTtlConfig,
} from '@/shared/constants/basic-ttl';

export function useBasicTtlOption(): {
    ttlConfig: BasicTtlConfig;
    ttlMs: number | null;
} {
    const [ttlConfig, setTtlConfig] = useState<BasicTtlConfig>(BASIC_TTL_DEFAULT);

    useEffect(() => {
        let mounted = true;

        getBasicTtlConfig().then((config) => {
            if (mounted) setTtlConfig(config);
        }).catch(() => {
            // Keep default on failure
        });

        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ): void => {
            if (area !== 'local' || !changes[BASIC_TTL_STORAGE_KEY]) return;
            const next = changes[BASIC_TTL_STORAGE_KEY].newValue;
            if (isBasicTtlConfig(next)) setTtlConfig(next);
        };

        if (typeof chrome !== 'undefined' && chrome.storage?.onChanged?.addListener) {
            chrome.storage.onChanged.addListener(listener);
        }

        return () => {
            mounted = false;
            if (typeof chrome !== 'undefined' && chrome.storage?.onChanged?.removeListener) {
                chrome.storage.onChanged.removeListener(listener);
            }
        };
    }, []);

    return { ttlConfig, ttlMs: basicTtlConfigToMs(ttlConfig) };
}
