/**
 * Mode State Manager
 *
 * Single Source of Truth for mode state with persistence and broadcasting.
 * Implements State Management Pattern.
 */

import type { ModeManager } from './mode-manager';

import { ValidationError } from '@/shared/errors/app-error';
import { RepositoryFactory } from '@/shared/repositories';
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

    constructor(
        private readonly modeManager: ModeManager,
        private readonly logger: ILogger
    ) { }

    /**
     * Initialize from user preference
     */
    async init(): Promise<void> {
        try {
            const result = await chrome.storage.sync.get(['defaultMode', 'metadata']);
            const loadedMode = result['defaultMode'];
            const loadedMetadata = result['metadata'];

            // Validate loaded mode with Zod
            const validation = ModeTypeSchema.safeParse(loadedMode);

            if (validation.success) {
                this.currentMode = validation.data;
                this.logger.info('[ModeState] Loaded user preference', {
                    mode: this.currentMode,
                });
            } else {
                // Invalid mode in storage - fall back to default
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

                    // Check if migration is needed
                    if (this.metadata.version < 2) {
                        this.logger.info('[ModeState] Migration needed', {
                            currentVersion: this.metadata.version,
                            targetVersion: 2,
                        });
                    }
                } else {
                    this.logger.error('[ModeState] Invalid metadata in storage', new Error(
                        `Invalid metadata: ${metadataValidation.error.message}`
                    ));
                }
            } else {
                // No metadata = v1 state
                this.logger.info('[ModeState] No metadata found - v1 state detected, migration needed');
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
        // Validate mode with Zod BEFORE any state changes
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

        if (this.currentMode === validatedMode) {
            this.logger.debug('[ModeState] Already in mode', { mode: validatedMode });
            return;
        }

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
