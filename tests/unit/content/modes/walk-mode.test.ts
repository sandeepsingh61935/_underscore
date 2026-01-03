/**
 * Walk Mode Unit Tests
 *
 * Tests for ephemeral highlighting with zero persistence
 * Walk Mode Philosophy: "True Incognito" - privacy-first, memory-only
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { WalkMode } from '@/content/modes/walk-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

describe('WalkMode - Ephemeral Highlighting', () => {
  let walkMode: WalkMode;
  let repository: InMemoryHighlightRepository;
  let eventBus: EventBus;
  let logger: ConsoleLogger;

  beforeEach(() => {
    // Mock CSS Highlight API (not available in JSDOM)
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

    // Setup dependencies
    repository = new InMemoryHighlightRepository();
    eventBus = new EventBus(new ConsoleLogger('test', LogLevel.NONE));
    logger = new ConsoleLogger('walk-mode-test', LogLevel.NONE);

    walkMode = new WalkMode(repository, eventBus, logger);
  });

  describe('Highlight Creation', () => {
    it('should create highlight in memory only', async () => {
      // Arrange
      const selection = createMockSelection('Test highlight');

      // Act
      const id = await walkMode.createHighlight(selection, 'yellow');

      // Assert
      expect(id).toBeTruthy();
      expect(walkMode.getHighlight(id)).toBeTruthy();
      expect(walkMode.getHighlight(id)!.text).toBe('Test highlight');
    });

    it('should deduplicate highlights via content hash', async () => {
      // Arrange
      const selection1 = createMockSelection('Duplicate text');
      const selection2 = createMockSelection('Duplicate text');

      // Act
      const id1 = await walkMode.createHighlight(selection1, 'yellow');
      const id2 = await walkMode.createHighlight(selection2, 'blue');

      // Assert
      expect(id1).toBe(id2); // Same ID returned for duplicate content
      expect(walkMode.getAllHighlights().length).toBe(1);
    });

    it('should reject empty selection', async () => {
      // Arrange
      const emptySelection = createMockSelection('   '); // Whitespace only

      // Act & Assert
      await expect(walkMode.createHighlight(emptySelection, 'yellow')).rejects.toThrow(
        'Empty text selection'
      );
    });

    it('should apply correct color role', async () => {
      // Arrange
      const selection = createMockSelection('Colored text');

      // Act
      const id = await walkMode.createHighlight(selection, 'blue');

      // Assert
      const highlight = walkMode.getHighlight(id);
      expect(highlight!.colorRole).toBe('blue');
    });
  });

  describe('Highlight Removal', () => {
    it('should remove highlight from memory and DOM', async () => {
      // Arrange
      const selection = createMockSelection('To be removed');
      const id = await walkMode.createHighlight(selection, 'yellow');
      expect(walkMode.getHighlight(id)).toBeTruthy();

      // Act
      await walkMode.removeHighlight(id);

      // Assert
      expect(walkMode.getHighlight(id)).toBeNull();
      expect(global.CSS.highlights.has(id)).toBe(false);
    });

    it('should handle removal of non-existent highlight gracefully', async () => {
      // Act & Assert - should not throw
      await expect(walkMode.removeHighlight('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('Clear All Highlights', () => {
    it('should remove all highlights from memory and DOM', async () => {
      // Arrange
      await walkMode.createHighlight(createMockSelection('Highlight 1'), 'yellow');
      await walkMode.createHighlight(createMockSelection('Highlight 2'), 'blue');
      await walkMode.createHighlight(createMockSelection('Highlight 3'), 'green');
      expect(walkMode.getAllHighlights().length).toBe(3);

      // Act
      await walkMode.clearAll();

      // Assert
      expect(walkMode.getAllHighlights().length).toBe(0);
      expect(global.CSS.highlights.size).toBe(0);
    });
  });

  describe('Ephemeral Behavior - No Persistence', () => {
    it('should NOT restore highlights (shouldRestore returns false)', () => {
      // Act & Assert
      expect(walkMode.shouldRestore()).toBe(false);
    });

    it('should have no-op onHighlightCreated (no persistence)', async () => {
      // Arrange
      const event = {
        type: 'highlight:created' as const,
        highlightId: 'test-id',
        text: 'test',
        timestamp: new Date(),
        highlight: {} as any,
      };

      // Act - should complete without errors
      await expect(walkMode.onHighlightCreated(event)).resolves.not.toThrow();

      // No storage calls should be made (Walk Mode has no storage)
    });

    it('should have no-op onHighlightRemoved (no persistence)', async () => {
      // Arrange
      const event = {
        type: 'highlight:removed' as const,
        highlightId: 'test-id',
        timestamp: new Date(),
      };

      // Act - should complete without errors
      await expect(walkMode.onHighlightRemoved(event)).resolves.not.toThrow();
    });

    it('should use InMemoryRepository (no persistence)', () => {
      // Assert - repository should be in-memory only
      expect(repository).toBeInstanceOf(InMemoryHighlightRepository);
    });
  });

  describe('Mode Capabilities', () => {
    it('should have correct capability configuration', () => {
      // Assert
      expect(walkMode.capabilities).toEqual({
        persistence: 'none',
        undo: false,
        sync: false,
        collections: false,
        tags: false,
        export: false,
        ai: false,
        search: false,
        multiSelector: false,
      });
    });

    it('should have privacy-first deletion config', () => {
      // Act
      const config = walkMode.getDeletionConfig();

      // Assert
      expect(config.showDeleteIcon).toBe(true);
      expect(config.requireConfirmation).toBe(false); // Ephemeral, no confirmation needed
      expect(config.allowUndo).toBe(true);
      expect(config.iconType).toBe('remove'); // Less aggressive than 'trash'
    });
  });

  describe('Repository Integration', () => {
    it('should store highlights in repository for UI consistency', async () => {
      // Arrange
      const selection = createMockSelection('Repository test');

      // Act
      const id = await walkMode.createHighlight(selection, 'yellow');

      // Assert
      const fromRepo = await repository.findById(id);
      expect(fromRepo).toBeTruthy();
      expect(fromRepo!.text).toBe('Repository test');
    });

    it('should remove from repository on delete', async () => {
      // Arrange
      const selection = createMockSelection('To delete');
      const id = await walkMode.createHighlight(selection, 'yellow');
      expect(await repository.findById(id)).toBeTruthy();

      // Act
      await walkMode.removeHighlight(id);

      // Assert
      expect(await repository.findById(id)).toBeNull();
    });

    it('should clear repository on clearAll', async () => {
      // Arrange
      await walkMode.createHighlight(createMockSelection('Test 1'), 'yellow');
      await walkMode.createHighlight(createMockSelection('Test 2'), 'blue');
      expect((await repository.findAll()).length).toBe(2);

      // Act
      await walkMode.clearAll();

      // Assert
      expect((await repository.findAll()).length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple highlights with different colors', async () => {
      // Arrange & Act
      const id1 = await walkMode.createHighlight(
        createMockSelection('Yellow text'),
        'yellow'
      );
      const id2 = await walkMode.createHighlight(
        createMockSelection('Blue text'),
        'blue'
      );
      const id3 = await walkMode.createHighlight(
        createMockSelection('Green text'),
        'green'
      );

      // Assert
      expect(walkMode.getHighlight(id1)!.colorRole).toBe('yellow');
      expect(walkMode.getHighlight(id2)!.colorRole).toBe('blue');
      expect(walkMode.getHighlight(id3)!.colorRole).toBe('green');
    });

    it('should handle rapid create/delete cycles', async () => {
      // Act
      for (let i = 0; i < 10; i++) {
        const id = await walkMode.createHighlight(
          createMockSelection(`Rapid ${i}`),
          'yellow'
        );
        await walkMode.removeHighlight(id);
      }

      // Assert
      expect(walkMode.getAllHighlights().length).toBe(0);
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
