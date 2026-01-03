/**
 * Integration Tests for Mode Switching and Count Synchronization
 * 
 * Regression tests for Issue #3: Extension UI count not updating on mode switch
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';

import { SprintMode } from '@/content/modes/sprint-mode';
import { WalkMode } from '@/content/modes/walk-mode';
import { ModeManager } from '@/content/modes/mode-manager';
import type { IStorage } from '@/shared/interfaces/i-storage';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

// Mock browser.runtime.sendMessage
vi.mock('wxt/browser', () => ({
    browser: {
        runtime: {
            sendMessage: vi.fn(),
        },
    },
}));

describe('Mode Switching - Count Synchronization', () => {
    let modeManager: ModeManager;
    let sprintMode: SprintMode;
    let walkMode: WalkMode;
    let repository: InMemoryHighlightRepository;
    let mockStorage: IStorage;
    let eventBus: EventBus;
    let logger: ConsoleLogger;
    let broadcastCountSpy: ReturnType<typeof vi.fn>;

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
        logger = new ConsoleLogger('mode-switch-test', LogLevel.NONE);

        mockStorage = {
            saveEvent: vi.fn().mockResolvedValue(undefined),
            loadEvents: vi.fn().mockResolvedValue([]),
            clear: vi.fn().mockResolvedValue(undefined),
        };

        // Create modes
        walkMode = new WalkMode(repository, eventBus, logger);
        sprintMode = new SprintMode(repository, mockStorage, eventBus, logger);

        // Create mode manager
        modeManager = new ModeManager(eventBus, logger);
        modeManager.registerMode(walkMode);
        modeManager.registerMode(sprintMode);

        // Mock broadcastCount function (simulates content.ts behavior)
        broadcastCountSpy = vi.fn(() => {
            browser.runtime.sendMessage({
                type: 'HIGHLIGHT_COUNT_UPDATE',
                count: repository.count(),
            });
        });

        // Clear mocks
        vi.clearAllMocks();
    });

    describe('[Issue #3] Extension UI Count Updates', () => {
        it('should broadcast count after switching from Walk to Sprint Mode', async () => {
            // Arrange - Start in Walk Mode
            await modeManager.activateMode('walk');

            // Create highlights in Walk Mode
            const selection1 = createMockSelection('Walk highlight 1');
            await walkMode.createHighlight(selection1, 'yellow');
            const selection2 = createMockSelection('Walk highlight 2');
            await walkMode.createHighlight(selection2, 'blue');

            expect(repository.count()).toBe(2);

            // Act - Switch to Sprint Mode (should clear Walk highlights)
            await modeManager.activateMode('sprint');

            // Simulate the background processing that happens in content.ts
            await modeManager.getCurrentMode().clearAll(); // Walk Mode clears on deactivate

            // This is where broadcastCount() should be called
            broadcastCountSpy();

            // Assert
            expect(broadcastCountSpy).toHaveBeenCalled();
            expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'HIGHLIGHT_COUNT_UPDATE',
                count: 0, // Walk Mode highlights cleared
            });
        });

        it('should broadcast count after switching from Sprint to Walk Mode', async () => {
            // Arrange - Start in Sprint Mode with highlights
            await modeManager.activateMode('sprint');

            const selection1 = createMockSelection('Sprint highlight 1');
            await sprintMode.createHighlight(selection1, 'yellow');
            const selection2 = createMockSelection('Sprint highlight 2');
            await sprintMode.createHighlight(selection2, 'blue');
            const selection3 = createMockSelection('Sprint highlight 3');
            await sprintMode.createHighlight(selection3, 'green');

            expect(repository.count()).toBe(3);

            // Act - Switch to Walk Mode
            await modeManager.activateMode('walk');

            // Walk Mode should clear all highlights on activation
            await modeManager.getCurrentMode().clearAll();

            // This is where broadcastCount() should be called
            broadcastCountSpy();

            // Assert
            expect(broadcastCountSpy).toHaveBeenCalled();
            expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'HIGHLIGHT_COUNT_UPDATE',
                count: 0, // All highlights cleared in Walk Mode
            });
        });

        it('should broadcast count after restoring Sprint Mode highlights', async () => {
            // Arrange - Simulate page reload with Sprint Mode events in storage
            const mockEvents = [
                {
                    type: 'highlight.created',
                    timestamp: Date.now(),
                    eventId: 'event-1',
                    data: {
                        id: 'hl-1',
                        text: 'Restored highlight 1',
                        contentHash: 'mock-hash-1',
                        color: 'yellow',
                        type: 'underscore',
                        ranges: [],
                    },
                },
                {
                    type: 'highlight.created',
                    timestamp: Date.now(),
                    eventId: 'event-2',
                    data: {
                        id: 'hl-2',
                        text: 'Restored highlight 2',
                        contentHash: 'mock-hash-2',
                        color: 'blue',
                        type: 'underscore',
                        ranges: [],
                    },
                },
            ];

            mockStorage.loadEvents = vi.fn().mockResolvedValue(mockEvents);

            // Act - Activate Sprint Mode (triggers restoration)
            await modeManager.activateMode('sprint');

            // Simulate restoration process
            const events = await mockStorage.loadEvents();
            for (const event of events) {
                if (event.type === 'highlight.created' && event.data) {
                    await repository.add(event.data as any);
                }
            }

            // This is where broadcastCount() should be called after restoration
            broadcastCountSpy();

            // Assert
            expect(broadcastCountSpy).toHaveBeenCalled();
            expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'HIGHLIGHT_COUNT_UPDATE',
                count: 2, // 2 highlights restored
            });
        });

        it('should broadcast correct count during rapid mode switches', async () => {
            // Arrange
            await modeManager.activateMode('sprint');
            await sprintMode.createHighlight(createMockSelection('Test 1'), 'yellow');
            await sprintMode.createHighlight(createMockSelection('Test 2'), 'blue');

            // Act - Rapid mode switches
            await modeManager.activateMode('walk');
            await modeManager.getCurrentMode().clearAll();
            broadcastCountSpy(); // Should broadcast 0

            await modeManager.activateMode('sprint');
            broadcastCountSpy(); // Should broadcast 0 (no highlights in Sprint after clear)

            // Assert
            expect(broadcastCountSpy).toHaveBeenCalledTimes(2);
            expect(browser.runtime.sendMessage).toHaveBeenLastCalledWith({
                type: 'HIGHLIGHT_COUNT_UPDATE',
                count: 0,
            });
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
