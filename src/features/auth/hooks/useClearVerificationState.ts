import { useIpcAction } from '@/shared/hooks/useIpcAction';

/**
 * Hook: send CLEAR_VERIFICATION_STATE to the background.
 *
 * Per ADR-004 + ADR-009: views never call chrome.runtime.sendMessage directly.
 * This hook is the canonical caller.
 */
export function useClearVerificationState() {
    return useIpcAction<void, void>('CLEAR_VERIFICATION_STATE');
}
