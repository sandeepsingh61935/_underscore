/**
 * Unit Tests for Delete Icon Consistency
 * 
 * Regression tests for Issue #4: Delete icon inconsistency across modes
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { SprintMode } from '@/content/modes/sprint-mode';
import { WalkMode } from '@/content/modes/walk-mode';
import type { IStorage } from '@/shared/interfaces/i-storage';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

describe('Delete Icon Consistency', () => {
    let walkMode: WalkMode;
    let sprintMode: SprintMode;
    let repository: InMemoryHighlightRepository;
    let mockStorage: IStorage;
    let eventBus: EventBus;
    let logger: ConsoleLogger;

    beforeEach(() => {
        // Mock CSS Highlight API
        if (typeof global.Highlight === 'undefined') {
            // @ts-ignore
            global.Highlight = class Highlight {
                constructor(..._ranges: Range[]) { }
            };
        }

        if (!global.CSS || !global.CSS.highlights) {
            // @ts-ignore
            global.CSS = { highlights: new Map() };
        }

        // Setup dependencies
        repository = new InMemoryHighlightRepository();
        eventBus = new EventBus(new ConsoleLogger('test', LogLevel.NONE));
        logger = new ConsoleLogger('icon-test', LogLevel.NONE);

        mockStorage = {
            saveEvent: async () => { },
            loadEvents: async () => [],
            clear: async () => { },
        };

        walkMode = new WalkMode(repository, eventBus, logger);
        sprintMode = new SprintMode(repository, mockStorage, eventBus, logger);
    });

    describe('[Issue #4] Icon Type Consistency', () => {
        it('should use "remove" (cross) icon in Walk Mode', () => {
            // Act
            const config = walkMode.getDeletionConfig();

            // Assert
            expect(config.iconType).toBe('remove');
        });

        it('should use "remove" (cross) icon in Sprint Mode', () => {
            // Act
            const config = sprintMode.getDeletionConfig();

            // Assert
            expect(config.iconType).toBe('remove'); // Fixed: was 'trash' before
        });

        it('should have consistent icon type across all modes', () => {
            // Act
            const walkConfig = walkMode.getDeletionConfig();
            const sprintConfig = sprintMode.getDeletionConfig();

            // Assert - Both should use the same icon type
            expect(walkConfig.iconType).toBe(sprintConfig.iconType);
            expect(walkConfig.iconType).toBe('remove'); // Cross icon
        });

        it('should maintain other deletion config differences between modes', () => {
            // Act
            const walkConfig = walkMode.getDeletionConfig();
            const sprintConfig = sprintMode.getDeletionConfig();

            // Assert - Icon type is same, but other configs differ
            expect(walkConfig.iconType).toBe(sprintConfig.iconType); // Same icon

            // But confirmation requirements differ
            expect(walkConfig.requireConfirmation).toBe(false); // Ephemeral, no confirmation
            expect(sprintConfig.requireConfirmation).toBe(true); // Persistent, needs confirmation

            // Both allow undo
            expect(walkConfig.allowUndo).toBe(true);
            expect(sprintConfig.allowUndo).toBe(true);
        });
    });

    describe('Deletion Config Validation', () => {
        it('should have valid deletion config in Walk Mode', () => {
            const config = walkMode.getDeletionConfig();

            expect(config.showDeleteIcon).toBe(true);
            expect(config.requireConfirmation).toBe(false);
            expect(config.allowUndo).toBe(true);
            expect(config.iconType).toBe('remove');
            expect(config.confirmationMessage).toBeUndefined(); // No confirmation needed
        });

        it('should have valid deletion config in Sprint Mode', () => {
            const config = sprintMode.getDeletionConfig();

            expect(config.showDeleteIcon).toBe(true);
            expect(config.requireConfirmation).toBe(true);
            expect(config.allowUndo).toBe(true);
            expect(config.iconType).toBe('remove');
            expect(config.confirmationMessage).toContain('Undo available');
        });
    });
});
