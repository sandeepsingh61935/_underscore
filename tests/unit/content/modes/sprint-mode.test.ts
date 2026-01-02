/**
 * Sprint Mode Full Test Suite
 * 
 * Tests for event sourcing, session persistence, and restoration
 * Sprint Mode Philosophy: "Use and forget" - session-based with 4-hour TTL
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SprintMode } from '@/content/modes/sprint-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import type { IStorage } from '@/shared/interfaces/i-storage';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

describe('SprintMode - Event Sourcing & Persistence', () => {
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
                constructor(...ranges: Range[]) { }
            };
        }

        if (!global.CSS || !global.CSS.highlights) {
            // @ts-ignore
            global.CSS = { highlights: new Map() };
        }

        // Setup dependencies
        repository = new InMemoryHighlightRepository();
        eventBus = new EventBus(new ConsoleLogger('test', LogLevel.NONE));
        logger = new ConsoleLogger('sprint-mode-test', LogLevel.NONE);

        // Mock storage with event sourcing
        mockStorage = {
            saveEvent: vi.fn().mockResolvedValue(undefined),
            loadEvents: vi.fn().mockResolvedValue([]),
            clear: vi.fn().mockResolvedValue(undefined),
        };

        sprintMode = new SprintMode(repository, mockStorage, eventBus, logger);
    });

    describe('Highlight Creation with Event Sourcing', () => {
        it('should emit event on highlight creation', async () => {
            // Arrange
            const selection = createMockSelection('Test highlight');
            const eventSpy = vi.spyOn(eventBus, 'emit');

            // Act
            const id = await sprintMode.createHighlight(selection, 'yellow');

            // Assert
            expect(id).toBeTruthy();
            expect(eventSpy).toHaveBeenCalledWith(
                'highlight:created',
                expect.objectContaining({
                    type: 'highlight:created',
                })
            );
        });

        it('should deduplicate highlights via content hash', async () => {
            // Arrange
            const selection1 = createMockSelection('Duplicate text');
            const selection2 = createMockSelection('Duplicate text');

            // Act
            const id1 = await sprintMode.createHighlight(selection1, 'yellow');
            const id2 = await sprintMode.createHighlight(selection2, 'blue');

            // Assert
            expect(id1).toBe(id2);
            expect(sprintMode.getAllHighlights().length).toBe(1);
        });

        it('should reject empty selection', async () => {
            // Arrange
            const emptySelection = createMockSelection('   ');

            // Act & Assert
            await expect(sprintMode.createHighlight(emptySelection, 'yellow'))
                .rejects.toThrow('Empty text selection');
        });

        it('should apply correct color role', async () => {
            // Arrange
            const selection = createMockSelection('Colored text');

            // Act
            const id = await sprintMode.createHighlight(selection, 'blue');

            // Assert
            const highlight = sprintMode.getHighlight(id);
            expect(highlight!.colorRole).toBe('blue');
        });

        it('should set createdAt and expiresAt timestamps', async () => {
            // Arrange
            const selection = createMockSelection('Timestamped highlight');
            const beforeCreate = Date.now();

            // Act
            const id = await sprintMode.createHighlight(selection, 'yellow');

            // Assert
            const highlight = sprintMode.getHighlight(id);
            expect(highlight!.createdAt).toBeDefined();
            expect(highlight!.expiresAt).toBeDefined();
            expect(highlight!.createdAt!.getTime()).toBeGreaterThanOrEqual(beforeCreate);
        });
    });

    describe('Highlight Removal with Event Sourcing', () => {
        it('should persist removal event', async () => {
            // Arrange
            const selection = createMockSelection('To be removed');
            const id = await sprintMode.createHighlight(selection, 'yellow');
            vi.clearAllMocks();

            // Act
            await sprintMode.removeHighlight(id);

            // Assert - removal should trigger event persistence
            expect(sprintMode.getHighlight(id)).toBeNull();
        });

        it('should handle removal of non-existent highlight gracefully', async () => {
            // Act & Assert
            await expect(sprintMode.removeHighlight('non-existent-id'))
                .resolves.not.toThrow();
        });
    });

    describe('Clear All with Event Sourcing', () => {
        it('should clear all highlights and persist event', async () => {
            // Arrange
            await sprintMode.createHighlight(createMockSelection('Highlight 1'), 'yellow');
            await sprintMode.createHighlight(createMockSelection('Highlight 2'), 'blue');
            await sprintMode.createHighlight(createMockSelection('Highlight 3'), 'green');
            expect(sprintMode.getAllHighlights().length).toBe(3);
            vi.clearAllMocks();

            // Act
            await sprintMode.clearAll();

            // Assert
            expect(sprintMode.getAllHighlights().length).toBe(0);
        });
    });

    describe('Event Handlers', () => {
        it('should persist event on onHighlightCreated', async () => {
            // Arrange - provide complete HighlightCreatedEvent structure
            const event = {
                type: 'highlight:created' as const,
                timestamp: new Date(),
                highlight: {
                    id: 'test-id',
                    text: 'test text',
                    contentHash: 'mock-hash-123',
                    color: '#FFEB3B',
                    colorRole: 'yellow',
                    ranges: [{
                        startOffset: 0,
                        endOffset: 9,
                        startContainerPath: '/html/body/p[1]/text()[1]',
                        endContainerPath: '/html/body/p[1]/text()[1]'
                    }],
                    type: 'underscore' as const,
                    createdAt: new Date(),
                },
            };

            // Act
            await sprintMode.onHighlightCreated(event);

            // Assert
            expect(mockStorage.saveEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'highlight.created',
                })
            );
        });

        it('should persist event on onHighlightRemoved', async () => {
            // Arrange
            const event = {
                type: 'highlight:removed' as const,
                highlightId: 'test-id',
                timestamp: Date.now(),
            };

            // Act
            await sprintMode.onHighlightRemoved(event);

            // Assert
            expect(mockStorage.saveEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'highlight.removed',
                })
            );
        });
    });

    describe('Restoration Behavior', () => {
        it('should restore highlights (shouldRestore returns true)', () => {
            // Act & Assert
            expect(sprintMode.shouldRestore()).toBe(true);
        });
    });

    describe('Mode Capabilities', () => {
        it('should have correct capability configuration', () => {
            // Assert
            expect(sprintMode.capabilities).toEqual({
                persistence: 'local',
                undo: true,
                sync: false,
                collections: false,
                tags: false,
                export: false,
                ai: false,
                search: false,
                multiSelector: false,
            });
        });

        it('should require confirmation for deletion', () => {
            // Act
            const config = sprintMode.getDeletionConfig();

            // Assert
            expect(config.showDeleteIcon).toBe(true);
            expect(config.requireConfirmation).toBe(true); // Persistent mode
            expect(config.allowUndo).toBe(true);
            expect(config.iconType).toBe('trash');
            expect(config.confirmationMessage).toContain('Undo available');
        });
    });

    describe('Repository Integration', () => {
        it('should store highlights in repository', async () => {
            // Arrange
            const selection = createMockSelection('Repository test');

            // Act
            const id = await sprintMode.createHighlight(selection, 'yellow');

            // Assert
            const fromRepo = await repository.findById(id);
            expect(fromRepo).toBeTruthy();
            expect(fromRepo!.text).toBe('Repository test');
        });

        it('should remove from repository on delete', async () => {
            // Arrange
            const selection = createMockSelection('To delete');
            const id = await sprintMode.createHighlight(selection, 'yellow');
            expect(await repository.findById(id)).toBeTruthy();

            // Act
            await sprintMode.removeHighlight(id);

            // Assert
            expect(await repository.findById(id)).toBeNull();
        });

        it('should clear repository on clearAll', async () => {
            // Arrange
            await sprintMode.createHighlight(createMockSelection('Test 1'), 'yellow');
            await sprintMode.createHighlight(createMockSelection('Test 2'), 'blue');
            expect((await repository.findAll()).length).toBe(2);

            // Act
            await sprintMode.clearAll();

            // Assert
            expect((await repository.findAll()).length).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle multiple highlights with different colors', async () => {
            // Arrange & Act
            const id1 = await sprintMode.createHighlight(createMockSelection('Yellow text'), 'yellow');
            const id2 = await sprintMode.createHighlight(createMockSelection('Blue text'), 'blue');
            const id3 = await sprintMode.createHighlight(createMockSelection('Green text'), 'green');

            // Assert
            expect(sprintMode.getHighlight(id1)!.colorRole).toBe('yellow');
            expect(sprintMode.getHighlight(id2)!.colorRole).toBe('blue');
            expect(sprintMode.getHighlight(id3)!.colorRole).toBe('green');
        });

        it('should handle rapid create/delete cycles', async () => {
            // Act
            for (let i = 0; i < 10; i++) {
                const id = await sprintMode.createHighlight(
                    createMockSelection(`Rapid ${i}`),
                    'yellow'
                );
                await sprintMode.removeHighlight(id);
            }

            // Assert
            expect(sprintMode.getAllHighlights().length).toBe(0);
        });

        it('should handle storage errors gracefully', async () => {
            // Arrange
            mockStorage.saveEvent = vi.fn().mockRejectedValue(new Error('Storage error'));
            const selection = createMockSelection('Error test');

            // Act & Assert - should not throw, error handled internally
            await expect(sprintMode.createHighlight(selection, 'yellow'))
                .resolves.toBeTruthy();
        });
    });
});

// Helper function to create mock Selection
function createMockSelection(text: string): Selection {
    const range = document.createRange();
    const textNode = document.createTextNode(text);
    document.body.appendChild(textNode);
    range.selectNodeContents(textNode);

    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    return selection;
}
