/**
 * Vault Mode Unit Tests
 *
 * Tests for IndexedDB persistence, 3-tier anchoring, and sync capabilities
 * Vault Mode Philosophy: "Permanent & Reliable" - store forever, recover from anything
 */

// Mock VaultModeService BEFORE any imports (hoisted by Vitest)
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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultMode } from '@/content/modes/vault-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

// Helper to create complete mock highlight data
function createMockHighlightData(id: string, text: string, colorRole: string = 'yellow') {
  return {
    id,
    text,
    contentHash: `mock-hash-${id}`, // Required for repository
    colorRole,
    type: 'underscore' as const,
    ranges: [
      {
        startOffset: 0,
        endOffset: text.length,
        startContainerPath: '/html/body/p[1]/text()[1]',
        endContainerPath: '/html/body/p[1]/text()[1]',
      },
    ],
    createdAt: new Date(),
  };
}

describe('VaultMode - IndexedDB Persistence & 3-Tier Anchoring', () => {
  let vaultMode: VaultMode;
  let repository: InMemoryHighlightRepository;
  let eventBus: EventBus;
  let logger: ConsoleLogger;

  beforeEach(() => {
    // Mock CSS Highlight API
    if (typeof global.Highlight === 'undefined') {
      // @ts-ignore
      global.Highlight = class Highlight {
        constructor(..._ranges: Range[]) {}
      };
    }

    if (!global.CSS || !global.CSS.highlights) {
      // @ts-ignore
      global.CSS = { highlights: new Map() };
    }

    // Reset mocks
    vi.clearAllMocks();

    // Setup dependencies
    repository = new InMemoryHighlightRepository();
    eventBus = new EventBus(new ConsoleLogger('test', LogLevel.NONE));
    logger = new ConsoleLogger('vault-mode-test', LogLevel.NONE);

    vaultMode = new VaultMode(repository, eventBus, logger);
  });

  describe('Highlight Creation with IndexedDB', () => {
    it('should create highlight and persist to IndexedDB', async () => {
      // Arrange
      const selection = createMockSelection('Test highlight');

      // Act
      const id = await vaultMode.createHighlight(selection, 'yellow');

      // Assert
      expect(id).toBeTruthy();
      expect(mockVaultService.saveHighlight).toHaveBeenCalled();
    });

    it('should deduplicate highlights via content hash', async () => {
      // Arrange
      const selection1 = createMockSelection('Duplicate text');
      const selection2 = createMockSelection('Duplicate text');

      // Act
      const id1 = await vaultMode.createHighlight(selection1, 'yellow');
      const id2 = await vaultMode.createHighlight(selection2, 'blue');

      // Assert
      expect(id1).toBe(id2);
      expect(vaultMode.getAllHighlights().length).toBe(1);
    });

    it('should reject empty selection', async () => {
      // Arrange
      const emptySelection = createMockSelection('   ');

      // Act & Assert
      await expect(vaultMode.createHighlight(emptySelection, 'yellow')).rejects.toThrow(
        'Empty text selection'
      );
    });

    it('should apply correct color role', async () => {
      // Arrange
      const selection = createMockSelection('Colored text');

      // Act
      const id = await vaultMode.createHighlight(selection, 'blue');

      // Assert
      const highlight = vaultMode.getHighlight(id);
      expect(highlight!.colorRole).toBe('blue');
    });
  });

  describe('Highlight Removal from IndexedDB', () => {
    it('should delete highlight from IndexedDB', async () => {
      // Arrange
      const selection = createMockSelection('To be removed');
      const id = await vaultMode.createHighlight(selection, 'yellow');
      vi.clearAllMocks();

      // Act
      await vaultMode.removeHighlight(id);

      // Assert
      expect(mockVaultService.deleteHighlight).toHaveBeenCalledWith(id);
      expect(vaultMode.getHighlight(id)).toBeNull();
    });

    it('should handle removal of non-existent highlight gracefully', async () => {
      // Act & Assert
      await expect(vaultMode.removeHighlight('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('Restoration from IndexedDB', () => {
    it('should restore highlights from IndexedDB', async () => {
      // Arrange
      const mockRestoredData = [
        {
          highlight: createMockHighlightData('restored-1', 'Restored highlight'),
          range: document.createRange(),
        },
      ];
      mockVaultService.restoreHighlightsForUrl.mockResolvedValue(mockRestoredData);

      // Act
      await vaultMode.restore();

      // Assert
      expect(mockVaultService.restoreHighlightsForUrl).toHaveBeenCalled();
      expect(vaultMode.getHighlight('restored-1')).toBeTruthy();
    });

    it('should enable restoration (shouldRestore returns true)', () => {
      // Act & Assert
      expect(vaultMode.shouldRestore()).toBe(true);
    });

    it('should sync restored highlights to repository', async () => {
      // Arrange
      const mockRestoredData = [
        {
          highlight: createMockHighlightData('restored-2', 'Restored for repo'),
          range: document.createRange(),
        },
      ];
      mockVaultService.restoreHighlightsForUrl.mockResolvedValue(mockRestoredData);

      // Act
      await vaultMode.restore();

      // Assert
      const fromRepo = await repository.findById('restored-2');
      expect(fromRepo).toBeTruthy();
    });
  });

  describe('Sync Capabilities', () => {
    it('should call VaultModeService.syncToServer()', async () => {
      // Act
      await vaultMode.sync();

      // Assert
      expect(mockVaultService.syncToServer).toHaveBeenCalled();
    });
  });

  describe('Mode Capabilities', () => {
    it('should have correct capability configuration', () => {
      // Assert
      expect(vaultMode.capabilities).toEqual({
        persistence: 'indexeddb',
        undo: true,
        sync: true,
        collections: true,
        tags: true,
        export: true,
        ai: false,
        search: true,
        multiSelector: true,
      });
    });

    it('should require confirmation for deletion', () => {
      // Act
      const config = vaultMode.getDeletionConfig();

      // Assert
      expect(config.showDeleteIcon).toBe(true);
      expect(config.requireConfirmation).toBe(true);
      expect(config.allowUndo).toBe(false); // Vault deletions are permanent
      expect(config.iconType).toBe('trash');
      expect(config.confirmationMessage).toContain('vault');
    });

    it('should have beforeDelete hook', () => {
      // Act
      const config = vaultMode.getDeletionConfig();

      // Assert
      expect(config.beforeDelete).toBeDefined();
      expect(typeof config.beforeDelete).toBe('function');
    });
  });

  describe('Repository Integration', () => {
    it('should store highlights in repository', async () => {
      // Arrange
      const selection = createMockSelection('Repository test');

      // Act
      const id = await vaultMode.createHighlight(selection, 'yellow');

      // Assert
      const fromRepo = await repository.findById(id);
      expect(fromRepo).toBeTruthy();
      expect(fromRepo!.text).toBe('Repository test');
    });

    it('should remove from repository on delete', async () => {
      // Arrange
      const selection = createMockSelection('To delete');
      const id = await vaultMode.createHighlight(selection, 'yellow');
      expect(await repository.findById(id)).toBeTruthy();

      // Act
      await vaultMode.removeHighlight(id);

      // Assert
      expect(await repository.findById(id)).toBeNull();
    });

    it('should clear repository on clearAll', async () => {
      // Arrange
      await vaultMode.createHighlight(createMockSelection('Test 1'), 'yellow');
      await vaultMode.createHighlight(createMockSelection('Test 2'), 'blue');
      expect((await repository.findAll()).length).toBe(2);

      // Act
      await vaultMode.clearAll();

      // Assert
      expect((await repository.findAll()).length).toBe(0);
      expect(mockVaultService.clearAll).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should handle IndexedDB save errors gracefully', async () => {
      // Arrange
      mockVaultService.saveHighlight.mockRejectedValueOnce(new Error('IndexedDB error'));
      const selection = createMockSelection('Error test');

      // Act & Assert - Vault Mode propagates errors
      await expect(vaultMode.createHighlight(selection, 'yellow')).rejects.toThrow(
        'IndexedDB error'
      );
    });

    it('should handle restoration errors gracefully', async () => {
      // Arrange
      mockVaultService.restoreHighlightsForUrl.mockRejectedValueOnce(
        new Error('Restore error')
      );

      // Act & Assert - should propagate error
      await expect(vaultMode.restore()).rejects.toThrow('Restore error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple highlights with different colors', async () => {
      // Arrange & Act
      const id1 = await vaultMode.createHighlight(
        createMockSelection('Yellow text'),
        'yellow'
      );
      const id2 = await vaultMode.createHighlight(
        createMockSelection('Blue text'),
        'blue'
      );
      const id3 = await vaultMode.createHighlight(
        createMockSelection('Green text'),
        'green'
      );

      // Assert
      expect(vaultMode.getHighlight(id1)!.colorRole).toBe('yellow');
      expect(vaultMode.getHighlight(id2)!.colorRole).toBe('blue');
      expect(vaultMode.getHighlight(id3)!.colorRole).toBe('green');
    });

    it('should handle rapid create/delete cycles', async () => {
      // Act
      for (let i = 0; i < 10; i++) {
        const id = await vaultMode.createHighlight(
          createMockSelection(`Rapid ${i}`),
          'yellow'
        );
        await vaultMode.removeHighlight(id);
      }

      // Assert
      expect(vaultMode.getAllHighlights().length).toBe(0);
    });

    it('should handle restoration with no highlights', async () => {
      // Arrange
      mockVaultService.restoreHighlightsForUrl.mockResolvedValue([]);

      // Act
      await vaultMode.restore();

      // Assert
      expect(vaultMode.getAllHighlights().length).toBe(0);
    });
  });

  describe('3-Tier Anchoring Integration', () => {
    it('should call VaultModeService with range for selector generation', async () => {
      // Arrange
      const selection = createMockSelection('Anchored text');

      // Act
      const id = await vaultMode.createHighlight(selection, 'yellow');

      // Assert
      expect(mockVaultService.saveHighlight).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
          text: 'Anchored text',
        }),
        expect.any(Range) // Range passed for selector generation
      );
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
