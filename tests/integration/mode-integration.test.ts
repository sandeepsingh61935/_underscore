/**
 * Mode Integration Tests
 * 
 * Tests for mode switching, data isolation, and cross-mode compatibility
 * Validates that modes work correctly together and maintain proper boundaries
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { WalkMode } from '@/content/modes/walk-mode';
import { SprintMode } from '@/content/modes/sprint-mode';
import { VaultMode } from '@/content/modes/vault-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

// Mock storage for Sprint Mode
const mockStorage = {
    saveEvent: vi.fn().mockResolvedValue(undefined),
    loadEvents: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
};

// Mock VaultModeService
const mockVaultService = {
    saveHighlight: vi.fn().mockResolvedValue(undefined),
    deleteHighlight: vi.fn().mockResolvedValue(undefined),
    restoreHighlightsForUrl: vi.fn().mockResolvedValue([]),
    clearAll: vi.fn().mockResolvedValue(undefined),
    syncToServer: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/services/vault-mode-service', () => ({
    getVaultModeService: () => mockVaultService,
}));

describe('Mode Integration Tests', () => {
    let eventBus: EventBus;
    let logger: ConsoleLogger;
    let walkRepository: InMemoryHighlightRepository;
    let sprintRepository: InMemoryHighlightRepository;
    let vaultRepository: InMemoryHighlightRepository;

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

        // Reset mocks
        vi.clearAllMocks();

        // Setup shared dependencies
        eventBus = new EventBus(new ConsoleLogger('test', LogLevel.NONE));
        logger = new ConsoleLogger('integration-test', LogLevel.NONE);

        // Each mode gets its own repository (data isolation)
        walkRepository = new InMemoryHighlightRepository();
        sprintRepository = new InMemoryHighlightRepository();
        vaultRepository = new InMemoryHighlightRepository();
    });

    describe('Mode Switching', () => {
        it('should switch from Walk to Sprint without data transfer', async () => {
            // Arrange
            const walkMode = new WalkMode(walkRepository, eventBus, logger);
            const sprintMode = new SprintMode(sprintRepository, mockStorage, eventBus, logger);

            // Create highlight in Walk Mode
            const selection = createMockSelection('Walk highlight');
            const walkId = await walkMode.createHighlight(selection, 'yellow');
            expect(walkMode.getHighlight(walkId)).toBeTruthy();

            // Act - Switch to Sprint Mode
            await walkMode.onDeactivate();
            await sprintMode.onActivate();

            // Assert - Walk highlight should NOT be in Sprint
            expect(sprintMode.getHighlight(walkId)).toBeNull();
            expect(sprintMode.getAllHighlights().length).toBe(0);
        });

        it('should switch from Sprint to Vault without automatic migration', async () => {
            // Arrange
            const sprintMode = new SprintMode(sprintRepository, mockStorage, eventBus, logger);
            const vaultMode = new VaultMode(vaultRepository, eventBus, logger);

            // Create highlight in Sprint Mode
            const selection = createMockSelection('Sprint highlight');
            const sprintId = await sprintMode.createHighlight(selection, 'blue');
            expect(sprintMode.getHighlight(sprintId)).toBeTruthy();

            // Act - Switch to Vault Mode
            await sprintMode.onDeactivate();
            await vaultMode.onActivate();

            // Assert - Sprint highlight should NOT auto-migrate to Vault
            expect(vaultMode.getHighlight(sprintId)).toBeNull();
            expect(vaultMode.getAllHighlights().length).toBe(0);
        });

        it('should switch from Vault to Walk and clear Vault highlights from view', async () => {
            // Arrange
            const vaultMode = new VaultMode(vaultRepository, eventBus, logger);
            const walkMode = new WalkMode(walkRepository, eventBus, logger);

            // Create highlight in Vault Mode
            const selection = createMockSelection('Vault highlight');
            const vaultId = await vaultMode.createHighlight(selection, 'green');
            expect(vaultMode.getHighlight(vaultId)).toBeTruthy();

            // Act - Switch to Walk Mode
            await vaultMode.onDeactivate();
            await walkMode.onActivate();

            // Assert - Vault highlight should NOT be in Walk
            expect(walkMode.getHighlight(vaultId)).toBeNull();
            expect(walkMode.getAllHighlights().length).toBe(0);
        });
    });

    describe('Data Isolation', () => {
        it('should maintain separate repositories for each mode', async () => {
            // Arrange
            const walkMode = new WalkMode(walkRepository, eventBus, logger);
            const sprintMode = new SprintMode(sprintRepository, mockStorage, eventBus, logger);
            const vaultMode = new VaultMode(vaultRepository, eventBus, logger);

            // Act - Create highlights in each mode
            const walkId = await walkMode.createHighlight(createMockSelection('Walk'), 'yellow');
            const sprintId = await sprintMode.createHighlight(createMockSelection('Sprint'), 'blue');
            const vaultId = await vaultMode.createHighlight(createMockSelection('Vault'), 'green');

            // Assert - Each repository has only its own highlight
            expect((await walkRepository.findAll()).length).toBe(1);
            expect((await sprintRepository.findAll()).length).toBe(1);
            expect((await vaultRepository.findAll()).length).toBe(1);

            expect(await walkRepository.findById(walkId)).toBeTruthy();
            expect(await walkRepository.findById(sprintId)).toBeNull();
            expect(await walkRepository.findById(vaultId)).toBeNull();
        });

        it('should not share content hash indexes between modes', async () => {
            // Arrange
            const walkMode = new WalkMode(walkRepository, eventBus, logger);
            const sprintMode = new SprintMode(sprintRepository, mockStorage, eventBus, logger);

            const sameText = 'Duplicate text across modes';

            // Act - Create same text in both modes
            const walkId = await walkMode.createHighlight(createMockSelection(sameText), 'yellow');
            const sprintId = await sprintMode.createHighlight(createMockSelection(sameText), 'blue');

            // Assert - Both should succeed (different repositories)
            expect(walkId).not.toBe(sprintId); // Different IDs
            expect(walkMode.getHighlight(walkId)).toBeTruthy();
            expect(sprintMode.getHighlight(sprintId)).toBeTruthy();
        });

        it('should clear only active mode highlights on clearAll', async () => {
            // Arrange
            const walkMode = new WalkMode(walkRepository, eventBus, logger);
            const sprintMode = new SprintMode(sprintRepository, mockStorage, eventBus, logger);

            await walkMode.createHighlight(createMockSelection('Walk 1'), 'yellow');
            await sprintMode.createHighlight(createMockSelection('Sprint 1'), 'blue');

            expect(walkMode.getAllHighlights().length).toBe(1);
            expect(sprintMode.getAllHighlights().length).toBe(1);

            // Act - Clear Walk Mode
            await walkMode.clearAll();

            // Assert - Only Walk cleared, Sprint untouched
            expect(walkMode.getAllHighlights().length).toBe(0);
            expect(sprintMode.getAllHighlights().length).toBe(1);
        });
    });

    describe('Cross-Mode Compatibility', () => {
        it('should allow same EventBus for all modes', () => {
            // Arrange & Act
            const walkMode = new WalkMode(walkRepository, eventBus, logger);
            const sprintMode = new SprintMode(sprintRepository, mockStorage, eventBus, logger);
            const vaultMode = new VaultMode(vaultRepository, eventBus, logger);

            // Assert - All modes share same EventBus instance
            expect(walkMode).toBeTruthy();
            expect(sprintMode).toBeTruthy();
            expect(vaultMode).toBeTruthy();
            // EventBus is shared, modes should not interfere
        });

        it('should handle rapid mode switching without errors', async () => {
            // Arrange
            const modes = [
                new WalkMode(walkRepository, eventBus, logger),
                new SprintMode(sprintRepository, mockStorage, eventBus, logger),
                new VaultMode(vaultRepository, eventBus, logger),
            ];

            // Act - Rapid switching
            for (let i = 0; i < 10; i++) {
                const mode = modes[i % 3];
                await mode.onActivate();
                await mode.createHighlight(createMockSelection(`Test ${i}`), 'yellow');
                await mode.onDeactivate();
            }

            // Assert - No errors thrown
            expect(true).toBe(true);
        });

        it('should respect mode capabilities independently', () => {
            // Arrange
            const walkMode = new WalkMode(walkRepository, eventBus, logger);
            const sprintMode = new SprintMode(sprintRepository, mockStorage, eventBus, logger);
            const vaultMode = new VaultMode(vaultRepository, eventBus, logger);

            // Assert - Each mode has correct capabilities
            expect(walkMode.capabilities.persistence).toBe('none');
            expect(sprintMode.capabilities.persistence).toBe('local');
            expect(vaultMode.capabilities.persistence).toBe('indexeddb');

            expect(walkMode.capabilities.sync).toBe(false);
            expect(sprintMode.capabilities.sync).toBe(false);
            expect(vaultMode.capabilities.sync).toBe(true);
        });
    });

    describe('Mode Lifecycle', () => {
        it('should call onActivate when mode becomes active', async () => {
            // Arrange
            const vaultMode = new VaultMode(vaultRepository, eventBus, logger);
            const activateSpy = vi.spyOn(vaultMode, 'onActivate');

            // Act
            await vaultMode.onActivate();

            // Assert
            expect(activateSpy).toHaveBeenCalled();
            expect(mockVaultService.restoreHighlightsForUrl).toHaveBeenCalled();
        });

        it('should call onDeactivate when mode becomes inactive', async () => {
            // Arrange
            const walkMode = new WalkMode(walkRepository, eventBus, logger);
            const deactivateSpy = vi.spyOn(walkMode, 'onDeactivate');

            // Act
            await walkMode.onDeactivate();

            // Assert
            expect(deactivateSpy).toHaveBeenCalled();
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
