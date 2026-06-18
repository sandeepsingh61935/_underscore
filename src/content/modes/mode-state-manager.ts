/**
 * Mode State Manager
 *
 * Single Source of Truth for mode state with persistence and broadcasting.
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
import {
  ModeTypeSchema,
  type ModeType,
  type StateMetadata,
} from '@/shared/schemas/mode-state-schemas';
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

  constructor(
    private readonly eventBus: EventBus,
    private readonly modeManager: ModeManager,
    private readonly logger: ILogger
  ) {
    this.stateMachine = new ModeStateMachine(logger);
    this.migrationEngine = new MigrationEngine(logger);

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

    try {
      const data = await chrome.storage.local.get('underscore_mode');
      const storedMode = data['underscore_mode'];
      if (storedMode) {
         this.currentMode = storedMode as ModeType;
      }
    } catch (e) {
      this.logger.warn('[ModeState] Failed to load mode preference', e as Error);
    }

    await this.applyMode();
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

      this.currentMode = validatedMode;
      this.metadata.lastModified = Date.now();

      this.logger.info('[ModeState] Switching mode', {
        from: previousMode,
        to: validatedMode,
      });

      // Save user preference locally (direct, no circuit breaker)
      try {
        await chrome.storage.local.set({ underscore_mode: validatedMode });
      } catch (e) {
        this.logger.warn('[ModeState] Failed to save mode preference', e as Error);
      }

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
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentMode));
  }
}