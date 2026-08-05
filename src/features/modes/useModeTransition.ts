import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getTransitionRule, executeTransitionGuard } from '@/content/modes/mode-transition-rules';
import { getEntitlementPaidActive } from '@/shared/billing';
import { resolveModeTransition } from '@/shared/utils/mode-transition';

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

            const decision = resolveModeTransition({
                from: currentMode,
                to: targetMode,
                isAuthenticated,
                isPaidActive: getEntitlementPaidActive(),
            });

            if (decision.kind === 'sign_in') {
                navigate(`/sign-in?intendedMode=${targetMode}`);
                return;
            }
            if (decision.kind === 'upgrade') {
                // Mode selection cannot open Polar; send Free users to Settings.
                navigate('/settings');
                return;
            }
            if (decision.kind === 'sign_out' || decision.kind === 'blocked') {
                return;
            }
            if (decision.kind === 'noop') {
                navigateAfterTransition?.();
                return;
            }

            // Check legacy confirmation matrix for persist transitions
            const rule = getTransitionRule(currentMode, targetMode);

            if (rule?.requiresConfirmation) {
                setState({
                    isPending: false,
                    targetMode,
                    confirmMessage: rule.reason,
                });
            } else {
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
                    {
                        isAuthenticated,
                        isPaidActive: getEntitlementPaidActive(),
                    },
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
