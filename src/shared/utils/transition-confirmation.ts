/**
 * @file transition-confirmation.ts
 * @description Utility for requesting user confirmation on risky mode transitions
 * 
 * Handles user confirmation dialogs for transitions that may have
 * data loss or other consequences.
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/**
 * Request user confirmation for a mode transition
 * 
 * @param from - Current mode
 * @param to - Target mode
 * @param reason - Human-readable reason for confirmation
 * @returns Promise<boolean> - true if user approves, false otherwise
 */
export async function requestTransitionConfirmation(
    from: ModeType,
    to: ModeType,
    reason: string
): Promise<boolean> {
    try {
        // Format confirmation message
        const message = formatConfirmationMessage(from, to, reason);

        // Show native confirmation dialog
        const confirmed = window.confirm(message);

        return confirmed;
    } catch (error) {
        // If confirmation fails (e.g., dialog blocked), default to false (safe)
        console.error('Failed to show confirmation dialog:', error);
        return false;
    }
}

/**
 * Format a user-friendly confirmation message
 * 
 * @param from - Current mode
 * @param to - Target mode
 * @param reason - Reason for confirmation
 * @returns Formatted message string
 */
function formatConfirmationMessage(
    from: ModeType,
    to: ModeType,
    reason: string
): string {
    const header = `Switch from ${from} mode to ${to} mode?`;

    if (!reason || reason.trim().length === 0) {
        return header;
    }

    return `${header}\n\n${reason}\n\nDo you want to continue?`;
}

/**
 * Create a guard function that requests confirmation
 * 
 * This can be used directly in transition rules.
 * 
 * @param reason - Reason for confirmation
 * @returns Guard function that requests confirmation
 */
export function createConfirmationGuard(reason: string): () => Promise<boolean> {
    return async () => {
        // For now, we can't access from/to in the guard context
        // So we'll use a simplified confirmation
        try {
            return window.confirm(`${reason}\n\nDo you want to continue?`);
        } catch (error) {
            console.error('Confirmation guard failed:', error);
            return false;
        }
    };
}
