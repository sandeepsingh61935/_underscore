import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getTransitionRule, executeTransitionGuard } from '@/content/modes/mode-transition-rules';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

interface ModeTransitionState {
    isPending: boolean;
    targetMode: ModeType | null;
    confirmMessage: string | null;
}

/**
 * Custom hook wrapping mode transition logic:
 * - Checks transition rules
 * - Shows confirmation when required
 * - Runs guard functions
 * - Executes transition with spinner overlay
 */
export function useModeTransition() {
    const navigate = useNavigate();
    const { currentMode, setMode, isAuthenticated } = useApp();
    const { logout } = useCurrentUser();
    const [state, setState] = useState<ModeTransitionState>({
        isPending: false,
        targetMode: null,
        confirmMessage: null,
    });

    const requestTransition = useCallback(
        (targetMode: ModeType) => {
            if (targetMode === currentMode) {
                // Same mode — just go to collections
                navigate('/collections');
                return;
            }

            // Auth-gated modes
            if ((targetMode === 'vault' || targetMode === 'neural') && !isAuthenticated) {
                navigate('/sign-in');
                return;
            }

            // Check transition rule
            const rule = getTransitionRule(currentMode, targetMode);

            if (rule?.requiresConfirmation) {
                setState({
                    isPending: false,
                    targetMode,
                    confirmMessage: rule.reason,
                });
            } else {
                // Direct transition
                executeTransitionDirect(targetMode);
            }
        },
        [currentMode, isAuthenticated, navigate]
    );

    const executeTransitionDirect = useCallback(
        async (targetMode: ModeType) => {
            setState(s => ({ ...s, isPending: true, confirmMessage: null }));

            try {
                // Run guard if exists
                const guardResult = await executeTransitionGuard(
                    currentMode,
                    targetMode
                ).catch(() => true);

                if (!guardResult) {
                    setState({ isPending: false, targetMode: null, confirmMessage: null });
                    return;
                }

                // Simulate transfer time
                await new Promise(r => setTimeout(r, 1800));

                // Check for downgrade from auth-required mode to local mode
                const isDowngrade =
                    (currentMode === 'neural' || currentMode === 'vault') &&
                    (targetMode === 'walk' || targetMode === 'sprint');

                if (isDowngrade) {
                    console.log('[useModeTransition] Downgrading local mode. Triggering sync and auto sign-out...');
                    // TODO: Replace with real collection syncing logic
                    await logout();
                }

                setMode(targetMode);
                navigate('/collections');
            } finally {
                setState({ isPending: false, targetMode: null, confirmMessage: null });
            }
        },
        [currentMode, setMode, navigate]
    );

    const confirmTransition = useCallback(() => {
        if (state.targetMode) {
            executeTransitionDirect(state.targetMode);
        }
    }, [state.targetMode, executeTransitionDirect]);

    const cancelTransition = useCallback(() => {
        setState({ isPending: false, targetMode: null, confirmMessage: null });
    }, []);

    return {
        ...state,
        requestTransition,
        confirmTransition,
        cancelTransition,
    };
}
