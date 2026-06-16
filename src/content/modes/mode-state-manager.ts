/**
 * Mode State Manager
 *
 * Single Source of Truth for mode state with persistence and broadcasting.
 * Implements State Management Pattern with Circuit Breaker for storage resilience.
 */

import { migrateV1ToV2 } from './migrations/v1-to-v2';
import type { ModeManager } from './mode-manager';
import { ModeStateMachine } from './mode-state-machine';
import { MigrationEngine } from './state-migration';

import {
  StatePersistenceError,
  StateValidationError,
  StateTransitionError,
} from '@/shared/errors/state-errors';
import { RepositoryFactory } from '@/shared/repositories';
import {
  ModeTypeSchema,
  type ModeType,
  type StateMetadata,
  type StateChangeEvent,
  type StateMetrics,
  type DebugState,
} from '@/shared/schemas/mode-state-schemas';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

// Re-export ModeType for backward compatibility
export type { ModeType };

export class ModeStateManager {
  private currentMode: ModeType = 'ephemeral';
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
    private readonly eventBus: EventBus,
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
      description:
        'Migrate v1 state ({ defaultMode }) to v2 ({ currentMode, version, metadata })',
    });
  }

  /**
   * Initialize from user preference
   * Implements error boundary with fallback to default mode
   */
  async init(): Promise<void> {
    this.eventBus.on('STATE_MODE_CHANGED', async (event: any) => {
      if (event && event.mode) {
        this.currentMode = event.mode;
        await this.applyMode();
      }
    });
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
        const error = new StateValidationError(`Invalid mode: ${JSON.stringify(mode)}`, {
          mode,
          validationErrors: validation.error.issues,
        });
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
      const transitionResult = this.stateMachine.validateTransition(
        this.currentMode,
        validatedMode
      );

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
      const guardPassed = await this.stateMachine.executeGuards(
        this.currentMode,
        validatedMode
      );

      if (!guardPassed) {
        const reason = this.stateMachine.getTransitionReason(
          this.currentMode,
          validatedMode
        );

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
          reason,
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

      // 6. Dispatch Intent to Background Worker
      // Background worker is the single source of truth and will persist and broadcast state.
      try {
        this.eventBus.emit('INTENT_SET_MODE', { mode: validatedMode });
      } catch (intentError) {
        this.logger.error(
          '[ModeState] Failed to dispatch mode change intent',
          new StatePersistenceError('Intent dispatch failed during setMode', {
            originalError: intentError,
          })
        );
      }

      // 7. Apply to ModeManager and Notify Local Listeners (Optimistic)
      try {
        await this.applyMode();
        this.notifyListeners();
      } catch (activationError) {
        // Critical failure: We claimed to be in 'mode' but failed to activate it.
        // Revert state?
        this.logger.error(
          '[ModeState] Failed to activate mode, reverting',
          activationError as Error
        );

        this.currentMode = previousMode; // Revert
        await this.applyMode(); // Re-apply old mode

        throw new StateTransitionError('Activation failed', previousMode, validatedMode, {
          cause: activationError,
        });
      }
    } catch (error) {
      // Pass through specific errors, wrap others
      if (
        error instanceof StateValidationError ||
        error instanceof StateTransitionError ||
        error instanceof StatePersistenceError
      ) {
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
    if (this.currentMode !== 'ai') {
      RepositoryFactory.setMode(this.currentMode);
    }
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
      timestamp: Date.now(),
    };
  }
}
