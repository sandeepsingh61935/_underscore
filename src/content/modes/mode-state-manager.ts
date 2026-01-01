/**
 * Mode State Manager
 *
 * Single Source of Truth for mode state with persistence and broadcasting.
 * Implements State Management Pattern with Circuit Breaker for storage resilience.
 */

import type { ModeManager } from './mode-manager';

import { RepositoryFactory } from '@/shared/repositories';
import { ModeStateMachine } from './mode-state-machine';
import { MigrationEngine } from './state-migration';
import { migrateV1ToV2 } from './migrations/v1-to-v2';
import {
    ModeTypeSchema,
    StateMetadataSchema,
    type ModeType,
    type StateMetadata,
    type StateChangeEvent,
    type StateMetrics,
    type DebugState
} from '@/shared/schemas/mode-state-schemas';
import type { ILogger } from '@/shared/utils/logger';
import {
    StatePersistenceError,
    StateValidationError,
    StateTransitionError,
} from '@/shared/errors/state-errors';
import { CircuitBreaker, CircuitBreakerOpenError } from '@/shared/utils/circuit-breaker';

// Re-export ModeType for backward compatibility
export type { ModeType };

export class ModeStateManager {
    private currentMode: ModeType = 'walk';
    private metadata: StateMetadata = {
        version: 2,
        lastModified: Date.now(),
    };
    private listeners: Set<(mode: ModeType) => void> = new Set();
    private stateMachine: ModeStateMachine;
    private migrationEngine: MigrationEngine;
    private storageCircuitBreaker: CircuitBreaker;

    // History tracking
    private history: StateChangeEvent[] = [];
    private readonly MAX_HISTORY_SIZE = 100;

    // Metrics tracking
    private transitionCounts = new Map<string, number>();
    private failureCounts = new Map<string, number>();
    private timeInMode = new Map<ModeType, number>();
    private modeActivatedAt: number = Date.now();

    constructor(
        private readonly modeManager: ModeManager,
        private readonly logger: ILogger
    ) {
        this.stateMachine = new ModeStateMachine(logger);
        this.migrationEngine = new MigrationEngine(logger);

        // Initialize circuit breaker for storage operations
        this.storageCircuitBreaker = new CircuitBreaker(
            {
                failureThreshold: 3,
                resetTimeout: 30000, // 30 seconds
                successThreshold: 1,
                name: 'ModeStateStorage',
            },
            logger
        );

        // Register v1→v2 migration
        this.migrationEngine.registerMigration({
            fromVersion: 1,
            toVersion: 2,
            migrate: migrateV1ToV2,
            description: 'Migrate v1 state ({ defaultMode }) to v2 ({ currentMode, version, metadata })',
        });
    }

    /**
     * Initialize from user preference
     * Implements error boundary with fallback to default mode
     */
    async init(): Promise<void> {
        try {
            // Wrap storage read in circuit breaker
            // Fetch ALL keys to allow detection of legacy V1 state ('mode')
            const result = await this.storageCircuitBreaker.execute(
                () => chrome.storage.sync.get(null)
            );
            const loadedMode = result['defaultMode'];
            const loadedMetadata = result['metadata'];

            // Detect state version
            // Pass FULL result to allow detection of legacy keys ('mode')
            const currentVersion = this.migrationEngine.detectVersion(result);

            // Check if migration is needed
            if (currentVersion < this.migrationEngine.getCurrentVersion()) {
                this.logger.info('[ModeState] Migration needed', {
                    currentVersion,
                    targetVersion: this.migrationEngine.getCurrentVersion(),
                });

                // Perform migration
                const migrationResult = await this.migrationEngine.migrate(
                    result, // Pass full source state
                    currentVersion,
                    this.migrationEngine.getCurrentVersion()
                );

                if (migrationResult.success) {
                    const v2State = migrationResult.value;

                    // Apply migrated state IN MEMORY first
                    this.currentMode = v2State.currentMode;
                    this.metadata = v2State.metadata;

                    // Persist migrated state (non-blocking) with circuit breaker
                    try {
                        await this.storageCircuitBreaker.execute(
                            () => chrome.storage.sync.set({
                                defaultMode: v2State.currentMode,
                                metadata: v2State.metadata,
                            })
                        );

                        this.logger.info('[ModeState] Migration complete', {
                            mode: this.currentMode,
                        });
                    } catch (persistError) {
                        // Log but don't fail - state is good in memory
                        this.logger.error(
                            '[ModeState] Failed to persist migrated state',
                            new StatePersistenceError('Failed to save migrated state', {
                                originalError: persistError
                            })
                        );
                    }
                } else {
                    // Migration failed - fallback to defaults
                    this.logger.error('[ModeState] Migration failed', migrationResult.error);
                    this.currentMode = 'walk';
                    this.metadata = {
                        version: 2,
                        lastModified: Date.now(),
                    };
                }
            } else {
                // No migration needed - validate and load normally
                const validation = ModeTypeSchema.safeParse(loadedMode);

                if (validation.success) {
                    this.currentMode = validation.data;
                    this.logger.info('[ModeState] Loaded user preference', {
                        mode: this.currentMode,
                    });
                } else {
                    this.logger.warn(
                        '[ModeState] Invalid mode in storage, falling back',
                        new StateValidationError(`Invalid mode "${loadedMode}"`, {
                            mode: loadedMode,
                            validationErrors: validation.error.issues
                        })
                    );
                    this.currentMode = 'walk';
                }

                // Validate and load metadata INDEPENDENTLY
                if (loadedMetadata) {
                    const metadataValidation = StateMetadataSchema.safeParse(loadedMetadata);

                    if (metadataValidation.success) {
                        this.metadata = metadataValidation.data;
                    } else {
                        // Warn but don't reset MODE. Just repair metadata.
                        this.logger.warn(
                            '[ModeState] Invalid metadata in storage, resetting metadata',
                            new StateValidationError('Invalid metadata', {
                                validationErrors: metadataValidation.error.issues
                            })
                        );
                        // Fallback metadata only
                        this.metadata = {
                            version: 2,
                            lastModified: Date.now(),
                        };
                    }
                }
            }

            await this.applyMode();
        } catch (error) {
            // Check if circuit breaker is open
            if (error instanceof CircuitBreakerOpenError) {
                this.logger.warn(
                    '[ModeState] Circuit breaker open - using in-memory state only',
                    { circuitName: 'ModeStateStorage' }
                );
                // Don't reset mode - keep current in-memory state
                // Just apply the current mode without storage
                await this.applyMode();
                return;
            }

            // Critical initialization failure - fallback to safe default
            this.logger.error(
                '[ModeState] Failed to initialize mode state',
                new StatePersistenceError('Storage read failed during init', {
                    originalError: error
                })
            );
            // Fallback to walk mode
            this.currentMode = 'walk';
            await this.applyMode();
        }
    }

    /**
     * Get current mode
     */
    getMode(): ModeType {
        return this.currentMode;
    }

    /**
     * Set mode (with persistence and broadcast)
     */
    /**
     * Set mode (with persistence and broadcast)
     */
    async setMode(mode: ModeType): Promise<void> {
        try {
            // 1. Validate mode with Zod schema
            const validation = ModeTypeSchema.safeParse(mode);

            if (!validation.success) {
                const error = new StateValidationError(
                    `Invalid mode: ${JSON.stringify(mode)}`,
                    { mode, validationErrors: validation.error.issues }
                );
                // We re-throw validation errors as they are likely developer errors or bad calls
                this.logger.error('[ModeState] Validation failed', error);
                throw error;
            }

            const validatedMode = validation.data;

            // 2. Check if already in target mode
            if (this.currentMode === validatedMode) {
                this.logger.debug('[ModeState] Already in mode', { mode: validatedMode });
                return;
            }

            // 3. Validate transition via state machine
            const transitionResult = this.stateMachine.validateTransition(this.currentMode, validatedMode);

            if (!transitionResult.success) {
                const error = new StateTransitionError(
                    transitionResult.error.message,
                    this.currentMode,
                    validatedMode,
                    { originalError: transitionResult.error }
                );
                this.logger.error('[ModeState] Transition not allowed', error);
                throw error;
            }

            // 4. Execute guards before transition
            const guardPassed = await this.stateMachine.executeGuards(this.currentMode, validatedMode);

            if (!guardPassed) {
                const reason = this.stateMachine.getTransitionReason(this.currentMode, validatedMode);

                // Record failed transition for metrics
                this.recordTransitionFailure(this.currentMode, validatedMode);

                const error = new StateTransitionError(
                    `Transition guard failed: ${reason}`,
                    this.currentMode,
                    validatedMode
                );
                this.logger.warn('[ModeState] Transition blocked by guard', {
                    from: this.currentMode,
                    to: validatedMode,
                    reason
                });
                throw error;
            }

            // 5. Update Memory State (Optimistic Update)
            const previousMode = this.currentMode;

            // Update time tracking before switching
            this.updateTimeInMode();

            this.currentMode = validatedMode;
            this.metadata.lastModified = Date.now();

            // Record state change to history and metrics
            const reason = this.stateMachine.getTransitionReason(previousMode, validatedMode);
            this.recordHistory(previousMode, validatedMode, reason);
            this.recordTransition(previousMode, validatedMode);

            this.logger.info('[ModeState] Switching mode', {
                from: previousMode,
                to: validatedMode,
            });

            // 6. Persist preference (Non-blocking / Graceful Degradation) with circuit breaker
            try {
                await this.storageCircuitBreaker.execute(
                    () => chrome.storage.sync.set({
                        defaultMode: validatedMode,
                        metadata: this.metadata,
                    })
                );
            } catch (persistError) {
                // DON'T THROW - State is valid in memory
                this.logger.error(
                    '[ModeState] Failed to persist mode change',
                    new StatePersistenceError('Persistence failed during setMode', {
                        originalError: persistError
                    })
                );
            }

            // 7. Apply to ModeManager and Broadcast
            try {
                await this.applyMode();
                this.notifyListeners(); // Notify local first

                // Broadcast to popup (fire and forget)
                try {
                    await chrome.runtime.sendMessage({
                        type: 'MODE_CHANGED',
                        mode: validatedMode,
                    });
                } catch (msgError) {
                    this.logger.debug('[ModeState] Failed to broadcast mode change', { error: msgError });
                }

            } catch (activationError) {
                // Critical failure: We claimed to be in 'mode' but failed to activate it.
                // Revert state?
                this.logger.error('[ModeState] Failed to activate mode, reverting', activationError as Error);

                this.currentMode = previousMode; // Revert
                await this.applyMode(); // Re-apply old mode

                throw new StateTransitionError('Activation failed', previousMode, validatedMode, {
                    cause: activationError
                });
            }

        } catch (error) {
            // Pass through specific errors, wrap others
            if (error instanceof StateValidationError ||
                error instanceof StateTransitionError ||
                error instanceof StatePersistenceError) {
                throw error;
            }

            // Should properly wrap unknown errors needed?
            // For now, rethrow as is or wrap?
            // Existing tests might expect ValidationError or Error.
            throw error;
        }
    }

    /**
     * Subscribe to mode changes
     */
    subscribe(listener: (mode: ModeType) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private async applyMode(): Promise<void> {
        await this.modeManager.activateMode(this.currentMode);
        RepositoryFactory.setMode(this.currentMode);
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => listener(this.currentMode));
    }

    /**
     * Record state change to history
     * @private
     */
    private recordHistory(from: ModeType, to: ModeType, reason?: string): void {
        const entry: StateChangeEvent = {
            from,
            to,
            timestamp: Date.now(),
            reason,
        };

        this.history.push(entry);

        // LRU eviction - remove oldest if exceeding max size
        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift();
        }

        this.logger.debug('[ModeState] History recorded', entry);
    }

    /**
     * Get state change history (readonly copy)
     * @returns Readonly array of state change events
     */
    getHistory(): ReadonlyArray<StateChangeEvent> {
        return [...this.history]; // Defensive copy
    }

    /**
     * Clear history (useful for testing and debugging)
     */
    clearHistory(): void {
        this.history = [];
        this.logger.debug('[ModeState] History cleared');
    }

    /**
     * Record successful transition for metrics
     * @private
     */
    private recordTransition(from: ModeType, to: ModeType): void {
        const key = `${from}→${to}`;
        this.transitionCounts.set(key, (this.transitionCounts.get(key) || 0) + 1);
    }

    /**
     * Record failed transition (guard blocked)
     * @private
     */
    private recordTransitionFailure(from: ModeType, to: ModeType): void {
        const key = `${from}→${to}`;
        this.failureCounts.set(key, (this.failureCounts.get(key) || 0) + 1);
    }

    /**
     * Update time tracking when switching modes
     * @private
     */
    private updateTimeInMode(): void {
        const now = Date.now();
        const elapsed = now - this.modeActivatedAt;
        const current = this.timeInMode.get(this.currentMode) || 0;
        this.timeInMode.set(this.currentMode, current + elapsed);
        this.modeActivatedAt = now;
    }

    /**
     * Get all metrics snapshot
     * @returns Current state metrics
     */
    getMetrics(): StateMetrics {
        return {
            transitionCounts: Object.fromEntries(this.transitionCounts),
            failureCounts: Object.fromEntries(this.failureCounts),
            timeInMode: Object.fromEntries(this.timeInMode),
        };
    }

    /**
     * Get comprehensive debug state
     * Useful for debugging tools/devtools
     */
    getDebugState(): DebugState {
        // Explicitly update time tracking to get latest numbers
        this.updateTimeInMode();

        return {
            currentMode: this.currentMode,
            metadata: { ...this.metadata },
            history: this.getHistory(),
            metrics: this.getMetrics(), // Now pure (no side effect)
            timestamp: Date.now()
        };
    }
}
