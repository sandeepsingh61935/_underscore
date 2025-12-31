/**
 * Mode State Manager
 *
 * Single Source of Truth for mode state with persistence and broadcasting.
 * Implements State Management Pattern.
 */

import type { ModeManager } from './mode-manager';

import { ValidationError } from '@/shared/errors/app-error';
import { RepositoryFactory } from '@/shared/repositories';
import { ModeStateMachine } from './mode-state-machine';
import { MigrationEngine } from './state-migration';
import { migrateV1ToV2 } from './migrations/v1-to-v2';
import {
    ModeTypeSchema,
    StateMetadataSchema,
    type ModeType,
    type StateMetadata
} from '@/shared/schemas/mode-state-schemas';
import type { ILogger } from '@/shared/utils/logger';

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

    constructor(
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
            description: 'Migrate v1 state ({ defaultMode }) to v2 ({ currentMode, version, metadata })',
        });
    }

    /**
     * Initialize from user preference
     */
    async init(): Promise<void> {
        try {
            const result = await chrome.storage.sync.get(['defaultMode', 'metadata']);
            const loadedMode = result['defaultMode'];
            const loadedMetadata = result['metadata'];

            // Detect state version
            const currentVersion = this.migrationEngine.detectVersion({
                defaultMode: loadedMode,
                metadata: loadedMetadata,
            });

            // Check if migration is needed
            if (currentVersion < this.migrationEngine.getCurrentVersion()) {
                this.logger.info('[ModeState] Migration needed', {
                    currentVersion,
                    targetVersion: this.migrationEngine.getCurrentVersion(),
                });

                // Perform migration
                const migrationResult = await this.migrationEngine.migrate(
                    { defaultMode: loadedMode },
                    currentVersion,
                    this.migrationEngine.getCurrentVersion()
                );

                if (migrationResult.success) {
                    const v2State = migrationResult.value;

                    // Apply migrated state
                    this.currentMode = v2State.currentMode;
                    this.metadata = v2State.metadata;

                    // Persist migrated state
                    await chrome.storage.sync.set({
                        defaultMode: v2State.currentMode,
                        metadata: v2State.metadata,
                    });

                    this.logger.info('[ModeState] Migration complete', {
                        mode: this.currentMode,
                    });
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
                    this.logger.error('[ModeState] Invalid mode in storage', new Error(
                        `Invalid mode "${loadedMode}": ${validation.error.message}`
                    ));
                    this.currentMode = 'walk';
                }

                // Validate and load metadata
                if (loadedMetadata) {
                    const metadataValidation = StateMetadataSchema.safeParse(loadedMetadata);

                    if (metadataValidation.success) {
                        this.metadata = metadataValidation.data;
                    } else {
                        this.logger.error('[ModeState] Invalid metadata in storage', new Error(
                            `Invalid metadata: ${metadataValidation.error.message}`
                        ));
                    }
                }
            }

            await this.applyMode();
        } catch (error) {
            this.logger.error('[ModeState] Failed to load preference', error as Error);
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
    async setMode(mode: ModeType): Promise<void> {
        // 1. Validate mode with Zod schema
        const validation = ModeTypeSchema.safeParse(mode);

        if (!validation.success) {
            const error = new ValidationError(
                `Invalid mode: ${JSON.stringify(mode)}. ${validation.error.message}`,
                { mode, validationErrors: validation.error.issues }
            );
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
            this.logger.error('[ModeState] Transition not allowed', transitionResult.error);
            throw transitionResult.error;
        }

        // 4. Execute guards before transition
        const guardPassed = await this.stateMachine.executeGuards(this.currentMode, validatedMode);

        if (!guardPassed) {
            const error = new Error(
                `Transition guard failed: ${this.stateMachine.getTransitionReason(this.currentMode, validatedMode)}`
            );
            this.logger.warn('[ModeState] Transition blocked by guard', {
                from: this.currentMode,
                to: validatedMode
            });
            throw error;
        }

        // 5. Log successful transition
        this.logger.info('[ModeState] Switching mode', {
            from: this.currentMode,
            to: validatedMode,
        });

        this.currentMode = validatedMode;

        // 1. Update metadata timestamp
        this.metadata.lastModified = Date.now();

        // 2. Persist preference with metadata
        try {
            await chrome.storage.sync.set({
                defaultMode: mode,
                metadata: this.metadata,
            });
        } catch (error) {
            this.logger.error('[ModeState] Failed to persist preference', error as Error);
        }

        // 2. Apply to ModeManager
        await this.applyMode();

        // 3. Notify local listeners
        this.notifyListeners();

        // 4. Broadcast to popup
        try {
            chrome.runtime.sendMessage({
                type: 'MODE_CHANGED',
                mode,
            });
        } catch (_error) {
            // Popup might not be open, ignore
            this.logger.debug('[ModeState] No popup to notify');
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
}
