/**
 * @file mode-state-machine.ts
 * @description State machine orchestrating mode transitions
 * 
 * Coordinates transition validation, guard execution, and logging.
 * Uses transition rules defined in mode-transition-rules.ts.
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type { ILogger } from '@/shared/utils/logger';
import {
    getTransitionRule,
    executeTransitionGuard,
    type TransitionRule,
} from './mode-transition-rules';

/**
 * Result type for transition validation
 */
export type Result<T, E> =
    | { success: true; value: T }
    | { success: false; error: E };

/**
 * Mode State Machine
 * 
 * Orchestrates mode transitions by:
 * 1. Validating transitions against rules
 * 2. Executing guard functions
 * 3. Logging all transitions
 * 4. Tracking metrics (future)
 */
export class ModeStateMachine {
    constructor(private readonly logger: ILogger) { }

    /**
     * Check if a transition is allowed (simple boolean)
     * 
     * @param from - Current mode
     * @param to - Target mode
     * @returns true if transition is allowed
     */
    canTransition(from: ModeType, to: ModeType): boolean {
        const rule = getTransitionRule(from, to);
        return rule.allowed;
    }

    /**
     * Validate a transition and return detailed result
     * 
     * @param from - Current mode
     * @param to - Target mode
     * @returns Result with success/error
     */
    validateTransition(from: ModeType, to: ModeType): Result<void, Error> {
        this.logger.debug('Validating transition', { from, to });

        const rule = getTransitionRule(from, to);

        if (!rule.allowed) {
            return {
                success: false,
                error: new Error(`Transition from ${from} to ${to} is not allowed: ${rule.reason}`),
            };
        }

        return {
            success: true,
            value: undefined,
        };
    }

    /**
     * Execute guard functions for a transition
     * 
     * @param from - Current mode
     * @param to - Target mode
     * @returns Promise<boolean> - true if guard passes (or no guard exists)
     */
    async executeGuards(from: ModeType, to: ModeType): Promise<boolean> {
        const rule = getTransitionRule(from, to);

        if (!rule.guard) {
            // No guard = automatic pass
            return true;
        }

        this.logger.debug('Executing transition guard', { from, to });

        try {
            const result = await executeTransitionGuard(from, to);

            if (!result) {
                this.logger.warn('Transition guard failed', { from, to });
            }

            return result;
        } catch (error) {
            this.logger.error('Guard execution error', error as Error);
            return false;
        }
    }

    /**
     * Get human-readable reason for a transition
     * 
     * @param from - Current mode
     * @param to - Target mode
     * @returns Descriptive reason string
     */
    getTransitionReason(from: ModeType, to: ModeType): string {
        const rule = getTransitionRule(from, to);
        return rule.reason;
    }

    /**
     * Log a successful transition (for metrics tracking)
     * 
     * @param from - Source mode
     * @param to - Target mode
     */
    logTransition(from: ModeType, to: ModeType): void {
        this.logger.info('Mode transition', {
            from,
            to,
            timestamp: Date.now(),
        });
    }

    /**
     * Get the full transition rule (useful for UI)
     * 
     * @param from - Current mode
     * @param to - Target mode
     * @returns Complete transition rule
     */
    getRule(from: ModeType, to: ModeType): TransitionRule {
        return getTransitionRule(from, to);
    }
}
