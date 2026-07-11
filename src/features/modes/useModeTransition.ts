import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getTransitionRule, executeTransitionGuard } from '@/content/modes/mode-transition-rules';

interface ModeTransitionState {
    isPending: boolean;
    targetMode: ModeType | null;
    confirmMessage: string | null;
}

export interface UseModeTransitionOptions {
    /** Called after a mode transition completes — use this to navigate in the parent */
    navigateAfterTransition?: () => void;
}

/**
 * Custom hook wrapping mode transition logic:
 * - Checks transition rules
 * - Shows confirmation when required
 * - Runs guard functions
 * - Executes transition with spinner overlay
 * - Calls navigateAfterTransition on completion (parent controls routing)
 */
export function useModeTransition({ navigateAfterTransition }: UseModeTransitionOptions = {}) {
    const navigate = useNavigate();
    const { currentMode, setMode, isAuthenticated } = useApp();
    const [state, setState] = useState<ModeTransitionState>({
        isPending: false,
        targetMode: null,
        confirmMessage: null,
    });

    const requestTransition = useCallback(
        (targetMode: ModeType) => {
            if (targetMode === currentMode) {
                // Same mode — just go to collections via parent callback
                navigateAfterTransition?.();
                return;
            }

            // Auth-gated modes — redirect to sign-in
            if ((targetMode === 'pro' || targetMode === 'pro_xai') && !isAuthenticated) {
                navigate(`/sign-in?intendedMode=${targetMode}`);
                return;
            }

            // Signed-in users cannot switch to Basic
            if (targetMode === 'basic' && isAuthenticated) {
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
        [currentMode, isAuthenticated, navigate, navigateAfterTransition]
    );

    const executeTransitionDirect = useCallback(
        async (targetMode: ModeType) => {
            setState(s => ({ ...s, isPending: true, confirmMessage: null }));

            try {
                // Run guard if exists
                const guardResult = await executeTransitionGuard(
                    currentMode,
                    targetMode,
                    { isAuthenticated },
                ).catch(() => true);

                if (!guardResult) {
                    setState({ isPending: false, targetMode: null, confirmMessage: null });
                    return;
                }

                // Simulate transfer time
                await new Promise(r => setTimeout(r, 1800));

                setMode(targetMode);
                navigateAfterTransition?.();
            } finally {
                setState({ isPending: false, targetMode: null, confirmMessage: null });
            }
        },
        [currentMode, setMode, navigateAfterTransition, isAuthenticated]
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
