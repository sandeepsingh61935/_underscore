/**
 * IModeManager Interface Tests (4 tests)
 * 
 * Verifies that ModeManager implements IModeManager correctly
 * Uses real EventBus and Logger (minimal mocking)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModeManager } from '@/content/modes/mode-manager';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';

describe('IModeManager Interface (4 tests)', () => {
    let modeManager: ModeManager;
    let eventBus: EventBus;

    beforeEach(() => {
        // ✅ Use REAL implementations (not mocks)
        eventBus = new EventBus();
        const logger = LoggerFactory.getLogger('Test');
        modeManager = new ModeManager(eventBus, logger);
    });

    it('1. can registerMode() and activateMode()', async () => {
        // Arrange: Create a minimal test mode
        const testMode: IHighlightMode = {
            name: 'test',
            capabilities: { canPersist: false, canSync: false, canRestore: false },
            onActivate: vi.fn().mockResolvedValue(undefined),
            onDeactivate: vi.fn().mockResolvedValue(undefined),
            createHighlight: vi.fn(),
            createFromData: vi.fn(),
            removeHighlight: vi.fn(),
            updateHighlight: vi.fn(),
            getHighlight: vi.fn(),
            getAllHighlights: vi.fn(),
            clearAll: vi.fn(),
            onHighlightCreated: vi.fn(),
            onHighlightRemoved: vi.fn(),
            shouldRestore: () => false,
        };

        // Act
        modeManager.registerMode(testMode);
        await modeManager.activateMode('test');

        // Assert
        expect(testMode.onActivate).toHaveBeenCalledOnce();
        expect(modeManager.getCurrentMode()).toBe(testMode);
    });

    it('2. getCurrentMode() returns correct mode', async () => {
        // Arrange
        const mode1: IHighlightMode = {
            name: 'mode1',
            capabilities: { canPersist: false, canSync: false, canRestore: false },
            onActivate: vi.fn().mockResolvedValue(undefined),
            onDeactivate: vi.fn().mockResolvedValue(undefined),
            createHighlight: vi.fn(),
            createFromData: vi.fn(),
            removeHighlight: vi.fn(),
            updateHighlight: vi.fn(),
            getHighlight: vi.fn(),
            getAllHighlights: vi.fn(),
            clearAll: vi.fn(),
            onHighlightCreated: vi.fn(),
            onHighlightRemoved: vi.fn(),
            shouldRestore: () => false,
        };

        modeManager.registerMode(mode1);
        await modeManager.activateMode('mode1');

        // Act
        const currentMode = modeManager.getCurrentMode();

        // Assert
        expect(currentMode.name).toBe('mode1');
        expect(currentMode).toBe(mode1); // Same instance
    });

    it('3. createHighlight() delegates to current mode', async () => {
        // Arrange
        const mockCreateHighlight = vi.fn().mockResolvedValue('test-id-123');
        const testMode: IHighlightMode = {
            name: 'test',
            capabilities: { canPersist: false, canSync: false, canRestore: false },
            onActivate: vi.fn().mockResolvedValue(undefined),
            onDeactivate: vi.fn().mockResolvedValue(undefined),
            createHighlight: mockCreateHighlight,
            createFromData: vi.fn(),
            removeHighlight: vi.fn(),
            updateHighlight: vi.fn(),
            getHighlight: vi.fn(),
            getAllHighlights: vi.fn(),
            clearAll: vi.fn(),
            onHighlightCreated: vi.fn(),
            onHighlightRemoved: vi.fn(),
            shouldRestore: () => false,
        };

        modeManager.registerMode(testMode);
        await modeManager.activateMode('test');

        const mockSelection = {} as Selection;

        // Act
        const id = await modeManager.createHighlight(mockSelection, 'yellow');

        // Assert
        expect(mockCreateHighlight).toHaveBeenCalledWith(mockSelection, 'yellow');
        expect(id).toBe('test-id-123');
    });

    it('4. throws when no mode active', () => {
        // Arrange: No mode registered or activated

        // Act & Assert
        expect(() => modeManager.getCurrentMode()).toThrow(/no mode/i);
    });
});
