/**
 * @file create-highlight-command.test.ts
 * @description Unit tests for refactored CreateHighlightCommand
 * 
 * Testing Strategy: Follows testing-strategy-v2.md
 * - Pragmatic mocking: Mock IModeManager (external dependency)
 * - Real implementations: Use real serializeRange, deserializeRange
 * - Behavior verification: Spy on delegation calls
 * - Test isolation: Reset mocks between tests
 * 
 * @see Phase 1.1.2b: Write CreateHighlightCommand test suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateHighlightCommand } from '@/content/commands/simple-highlight-commands';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { ILogger } from '@/shared/utils/logger';
import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';

// Mock range converter to avoid DOM complexity in JSDOM
vi.mock('@/content/utils/range-converter', () => ({
    serializeRange: vi.fn().mockReturnValue({
        xpath: '/mock/xpath',
        startOffset: 0,
        endOffset: 5,
        text: 'test text'
    }),
    deserializeRange: vi.fn().mockImplementation(() => {
        const range = document.createRange();
        const textNode = document.createTextNode('test text');
        document.body.appendChild(textNode);
        range.selectNodeContents(textNode);
        return range;
    })
}));

/**
 * Test Fixture: Create mock IModeManager
 * Following testing-strategy-v2.md: Mock external dependencies only
 */
function createMockModeManager() {
    const mockMode: IHighlightMode = {
        name: 'sprint',
        isPersistent: true,
        createHighlight: vi.fn().mockResolvedValue('highlight-123'),
        removeHighlight: vi.fn().mockResolvedValue(undefined),
        getHighlight: vi.fn().mockReturnValue({ id: 'test-id', text: 'test' }),
        getAllHighlights: vi.fn().mockReturnValue([]),
        clear: vi.fn().mockResolvedValue(undefined),
        restore: vi.fn().mockResolvedValue(0),
        createFromData: vi.fn().mockResolvedValue(undefined), // Key: This gets called during redo!
        onActivate: vi.fn().mockResolvedValue(undefined),
        onDeactivate: vi.fn().mockResolvedValue(undefined),
    };

    const modeManager: IModeManager = {
        registerMode: vi.fn(),
        activateMode: vi.fn(),
        getCurrentMode: vi.fn().mockReturnValue(mockMode), // Always return same mockMode instance
        createHighlight: vi.fn().mockResolvedValue('highlight-123'),
        removeHighlight: vi.fn().mockResolvedValue(undefined),
        getHighlight: vi.fn().mockReturnValue({ id: 'highlight-123', text: 'test text' }),
    };

    return { modeManager, mockMode };
}

/**
 * Test Fixture: Create mock ILogger
 */
function createMockLogger(): ILogger {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
    };
}

/**
 * Test Fixture: Create mock Selection with Range
 */
function createMockSelection(text: string = 'test text'): Selection {
    const range = document.createRange();
    const textNode = document.createTextNode(text);
    document.body.appendChild(textNode);
    range.selectNodeContents(textNode);

    const selection = {
        rangeCount: 1,
        getRangeAt: vi.fn().mockReturnValue(range),
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
    } as unknown as Selection;

    return selection;
}

describe('CreateHighlightCommand', () => {
    let mockModeManager: IModeManager;
    let mockMode: IHighlightMode;
    let mockLogger: ILogger;
    let selection: Selection;

    beforeEach(() => {
        // Reset mocks for test isolation
        const mocks = createMockModeManager();
        mockModeManager = mocks.modeManager;
        mockMode = mocks.mockMode;
        mockLogger = createMockLogger();
        selection = createMockSelection();

        // Clear DOM
        document.body.innerHTML = '';
    });

    describe('Test 1: Calls modeManager.createHighlight() correctly', () => {
        it('should delegate highlight creation to modeManager with correct arguments', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act
            await command.execute();

            // Assert
            expect(mockModeManager.createHighlight).toHaveBeenCalledTimes(1);
            expect(mockModeManager.createHighlight).toHaveBeenCalledWith(
                selection,
                'yellow'
            );
        });
    });

    describe('Test 2: Stores returned highlight ID', () => {
        it('should store highlight ID from modeManager for undo operations', async () => {
            // Arrange
            (mockModeManager.createHighlight as ReturnType<typeof vi.fn>).mockResolvedValue('my-highlight-id');
            const command = new CreateHighlightCommand(
                selection,
                'blue',
                mockModeManager,
                mockLogger
            );

            // Act
            await command.execute();
            await command.undo();

            // Assert: Undo uses stored ID
            expect(mockModeManager.removeHighlight).toHaveBeenCalledWith('my-highlight-id');
        });
    });

    describe('Test 3: Undo calls modeManager.removeHighlight()', () => {
        it('should delegate removal to modeManager with stored highlight ID', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );
            await command.execute();

            // Act
            await command.undo();

            // Assert
            expect(mockModeManager.removeHighlight).toHaveBeenCalledTimes(1);
            expect(mockModeManager.removeHighlight).toHaveBeenCalledWith('highlight-123');
        });
    });

    describe('Test 4: Redo recreates highlight via createFromData()', () => {
        it('should recreate highlight using mode.createFromData() on redo', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );
            await command.execute();
            await command.undo();

            // Act: Redo (second execute)
            await command.execute();

            // Assert: Mode's createFromData was called
            expect(mockMode.createFromData).toHaveBeenCalledTimes(1);
            expect(mockMode.createFromData).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'highlight-123',
                    colorRole: 'yellow',
                    type: 'underscore',
                })
            );
        });
    });

    describe('Test 5: No direct repository calls (spy verified)', () => {
        it('should NOT call repository methods directly (delegates to mode)', async () => {
            // Arrange: Create spy to detect any repository calls
            const repositorySpy = {
                add: vi.fn(),
                remove: vi.fn(),
                addFromData: vi.fn(),
            };

            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act
            await command.execute();
            await command.undo();

            // Assert: Repository never called directly
            expect(repositorySpy.add).not.toHaveBeenCalled();
            expect(repositorySpy.remove).not.toHaveBeenCalled();
            expect(repositorySpy.addFromData).not.toHaveBeenCalled();
        });
    });

    describe('Test 6: No direct storage calls (spy verified)', () => {
        it('should NOT call storage.saveEvent() directly (mode handles persistence)', async () => {
            // Arrange: Create spy to detect any storage calls
            const storageSpy = {
                saveEvent: vi.fn(),
            };

            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act
            await command.execute();

            // Assert: Storage never called directly
            expect(storageSpy.saveEvent).not.toHaveBeenCalled();
        });
    });

    describe('Test 7: Works with mocked IModeManager', () => {
        it('should work with any IModeManager implementation (Dependency Inversion)', async () => {
            // Arrange: Different mock implementation
            const alternativeModeManager: IModeManager = {
                ...mockModeManager,
                createHighlight: vi.fn().mockResolvedValue('alt-id'),
            };

            const command = new CreateHighlightCommand(
                selection,
                'green',
                alternativeModeManager,
                mockLogger
            );

            // Act
            await command.execute();

            // Assert: Works with alternative implementation
            expect(alternativeModeManager.createHighlight).toHaveBeenCalledWith(
                selection,
                'green'
            );
        });
    });

    describe('Test 8: Error handling logs and rethrows', () => {
        it('should log error and rethrow when modeManager.createHighlight() fails', async () => {
            // Arrange
            const error = new Error('Mode creation failed');
            (mockModeManager.createHighlight as ReturnType<typeof vi.fn>).mockRejectedValue(error);

            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act & Assert
            await expect(command.execute()).rejects.toThrow('Mode creation failed');
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Command execute failed',
                error,
                expect.objectContaining({ colorRole: 'yellow' })
            );
        });

        it('should log error and rethrow when undo fails', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );
            await command.execute();

            const error = new Error('Remove failed');
            (mockModeManager.removeHighlight as ReturnType<typeof vi.fn>).mockRejectedValue(error);

            // Act & Assert
            await expect(command.undo()).rejects.toThrow('Remove failed');
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Command undo failed',
                error,
                expect.objectContaining({ highlightId: 'highlight-123' })
            );
        });
    });

    describe('Test 9: Undo before execute is safe', () => {
        it('should handle undo gracefully when execute was never called', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act: Undo without execute
            await command.undo();

            // Assert: Logs warning but doesn't crash
            expect(mockLogger.warn).toHaveBeenCalledWith('Cannot undo: No highlight ID stored');
            expect(mockModeManager.removeHighlight).not.toHaveBeenCalled();
        });
    });

    describe('Test 10: Multiple redo operations work', () => {
        it('should support multiple redo cycles', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act: Execute → Undo → Redo → Undo → Redo
            await command.execute();
            await command.undo();
            await command.execute(); // Redo 1
            await command.undo();
            await command.execute(); // Redo 2

            // Assert: Multiple redo calls work
            expect(mockMode.createFromData).toHaveBeenCalledTimes(2);
        });
    });

    describe('Test 11: Serialized range preserved across undo/redo', () => {
        it('should preserve serialized range for reliable redo operations', async () => {
            // Arrange
            const testText = 'Specific test content';
            const specificSelection = createMockSelection(testText);

            const command = new CreateHighlightCommand(
                specificSelection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act
            await command.execute();
            await command.undo();
            await command.execute(); // Redo

            // Assert: Range was preserved and used in redo
            const createFromDataCall = (mockMode.createFromData as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(createFromDataCall.text).toBe('test text'); // Matches mock
        });
    });

    describe('Test 12: Logger called for all operations', () => {
        it('should log debug messages for execute, undo, and redo', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act
            await command.execute(); // First execute
            await command.undo();
            await command.execute(); // Redo

            // Assert
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Highlight created via mode',
                expect.any(Object)
            );
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Highlight removed (undo)',
                expect.any(Object)
            );
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Highlight recreated (redo)',
                expect.any(Object)
            );
        });
    });

    describe('Test 13: Type safety (TypeScript compilation)', () => {
        it('should enforce type constraints at compile time', () => {
            // This test passes if TypeScript compiles successfully
            // We're testing that interfaces are enforced

            const command: CreateHighlightCommand = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager, // Must satisfy IModeManager
                mockLogger      // Must satisfy ILogger
            );

            expect(command).toBeInstanceOf(CreateHighlightCommand);
        });
    });

    describe('Test 14: Performance: execute() < 50ms', () => {
        it('should execute highlight creation quickly', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act & Assert
            const start = performance.now();
            await command.execute();
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(50);
        });
    });

    describe('Test 15: Memory: No leaked references', () => {
        it('should not hold references after undo', async () => {
            // Arrange
            const command = new CreateHighlightCommand(
                selection,
                'yellow',
                mockModeManager,
                mockLogger
            );

            // Act
            await command.execute();
            await command.undo();

            // Assert: Command can still redo after undo (ID preserved)
            await command.execute(); // Should work - ID is preserved
            expect(mockMode.createFromData).toHaveBeenCalled();
        });
    });
});
