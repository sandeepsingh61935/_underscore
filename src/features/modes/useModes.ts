import { useMemo } from 'react';
import { modeRegistry } from './registry';

export function useModes(isAuthenticated: boolean) {
    const modes = useMemo(() => {
        return modeRegistry.getAvailable(isAuthenticated);
    }, [isAuthenticated]);

    return { modes };
}
