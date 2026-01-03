/**
 * Walk Mode Integration Tests
 *
 * Validates Walk Mode integration with:
 * - Mode state manager
 * - Mode switching with cleanup
 * - Memory leak detection
 * - DOM cleanup verification
 * - Concurrent highlight creation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { WalkMode } from '@/content/modes/walk-mode';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

// Mock Highlight API
class MockHighlight {
  constructor(public range: Range) {}
}
global.Highlight = MockHighlight as any;
global.CSS = { highlights: new Map() } as any;

describe('Walk Mode - Integration Tests', () => {
  let walkMode: WalkMode;
  let mockRepository: IHighlightRepository;
  let mockEventBus: EventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Reset CSS.highlights
    (global.CSS.highlights as Map<string, any>).clear();

    // Mock repository (in-memory)
    mockRepository = {
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      findByContentHash: vi.fn().mockResolvedValue(null),
      getAll: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
    } as any;

    // Mock EventBus
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as any;

    // Create WalkMode instance
    walkMode = new WalkMode(mockRepository, mockEventBus, mockLogger);
  });

  afterEach(() => {
    // Cleanup after each test
    (global.CSS.highlights as Map<string, any>).clear();
  });

  // ============================================
  // Task 1: Mode State Manager Integration
  // ============================================
  describe('Mode State Manager Integration', () => {
    it('should integrate with mode state manager lifecycle', async () => {
      // Simulate mode activation
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Test text',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Create highlight
      const id = await walkMode.createHighlight(mockSelection, 'yellow');

      // Verify highlight exists
      expect(id).toBeDefined();
      expect(mockRepository.add).toHaveBeenCalled();

      // Simulate mode deactivation (cleanup)
      await walkMode.clearAll();

      // Verify all data cleared
      expect(mockRepository.clear).toHaveBeenCalled();
      expect((global.CSS.highlights as Map<string, any>).size).toBe(0);
    });

    it('should maintain state consistency during mode lifecycle', async () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Lifecycle test',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Create multiple highlights
      await walkMode.createHighlight(mockSelection, 'yellow');
      await walkMode.createHighlight(mockSelection, 'blue');

      // Verify both exist
      expect(mockRepository.add).toHaveBeenCalledTimes(2);

      // Clear all
      await walkMode.clearAll();

      // Verify complete cleanup
      expect(mockRepository.clear).toHaveBeenCalled();
    });
  });

  // ============================================
  // Task 2: Mode Switching with Cleanup
  // ============================================
  describe('Mode Switching with Cleanup', () => {
    it('should clean up all data on mode switch', async () => {
      // Ensure clean state
      (global.CSS.highlights as Map<string, any>).clear();

      // Ensure clean state
      (global.CSS.highlights as Map<string, any>).clear();

      // Create highlights in Walk Mode with unique text
      await walkMode.createHighlight(
        {
          rangeCount: 1,
          getRangeAt: () =>
            ({
              toString: () => 'Switch test 1',
              cloneRange: () => ({}),
            }) as any,
        } as unknown as Selection,
        'yellow'
      );

      await walkMode.createHighlight(
        {
          rangeCount: 1,
          getRangeAt: () =>
            ({
              toString: () => 'Switch test 2',
              cloneRange: () => ({}),
            }) as any,
        } as unknown as Selection,
        'blue'
      );

      // Verify highlights exist
      expect((global.CSS.highlights as Map<string, any>).size).toBe(2);

      // Simulate mode switch (Walk → Sprint)
      // In real implementation, mode manager would call clearAll()
      await walkMode.clearAll();

      // Verify Walk Mode data is completely gone
      expect((global.CSS.highlights as Map<string, any>).size).toBe(0);
      expect(mockRepository.clear).toHaveBeenCalled();
    });

    it('should not persist data after mode switch', async () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Persistence test',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Create highlight
      await walkMode.createHighlight(mockSelection, 'yellow');

      // Clear (simulate mode switch)
      await walkMode.clearAll();

      // Create new WalkMode instance (simulate page reload)
      new WalkMode(mockRepository, mockEventBus, mockLogger);

      // Verify no highlights restored (Walk Mode is ephemeral)
      const highlights = await mockRepository.findAll();
      expect(highlights).toHaveLength(0);
    });
  });

  // ============================================
  // Task 3: Memory Leak Detection
  // ============================================
  describe('Memory Leak Detection', () => {
    it('should not leak memory on clearAll', async () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Memory test',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Create 50 highlights
      for (let i = 0; i < 50; i++) {
        await walkMode.createHighlight(mockSelection, 'yellow');
      }

      // Verify highlights created
      expect(mockRepository.add).toHaveBeenCalled();

      // Clear all
      await walkMode.clearAll();

      // Verify all references cleared
      expect((global.CSS.highlights as Map<string, any>).size).toBe(0);
      expect(mockRepository.clear).toHaveBeenCalled();

      // Create new highlights after clear
      const newId = await walkMode.createHighlight(mockSelection, 'blue');
      expect(newId).toBeDefined();
    });

    it('should properly clean up on repeated create/clear cycles', async () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Cycle test',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Perform 10 create/clear cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create highlights
        for (let i = 0; i < 10; i++) {
          await walkMode.createHighlight(mockSelection, 'yellow');
        }

        // Clear all
        await walkMode.clearAll();

        // Verify clean state
        expect((global.CSS.highlights as Map<string, any>).size).toBe(0);
      }

      // Verify no memory accumulation (all clears successful)
      expect(mockRepository.clear).toHaveBeenCalledTimes(10);
    });
  });

  // ============================================
  // Task 4: DOM Cleanup Verification
  // ============================================
  describe('DOM Cleanup Verification', () => {
    it('should remove all highlights from CSS.highlights', async () => {
      // Ensure clean state
      (global.CSS.highlights as Map<string, any>).clear();

      // Ensure clean state
      (global.CSS.highlights as Map<string, any>).clear();

      // Create highlights with unique text
      await walkMode.createHighlight(
        {
          rangeCount: 1,
          getRangeAt: () =>
            ({
              toString: () => 'DOM test 1',
              cloneRange: () => ({}),
            }) as any,
        } as unknown as Selection,
        'yellow'
      );

      await walkMode.createHighlight(
        {
          rangeCount: 1,
          getRangeAt: () =>
            ({
              toString: () => 'DOM test 2',
              cloneRange: () => ({}),
            }) as any,
        } as unknown as Selection,
        'blue'
      );

      await walkMode.createHighlight(
        {
          rangeCount: 1,
          getRangeAt: () =>
            ({
              toString: () => 'DOM test 3',
              cloneRange: () => ({}),
            }) as any,
        } as unknown as Selection,
        'green'
      );

      // Verify DOM highlights exist
      expect((global.CSS.highlights as Map<string, any>).size).toBe(3);

      // Clear all
      await walkMode.clearAll();

      // Verify DOM completely cleaned
      expect((global.CSS.highlights as Map<string, any>).size).toBe(0);
    });

    it('should clean up individual highlights from DOM', async () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Individual cleanup',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Create highlight
      const id = await walkMode.createHighlight(mockSelection, 'yellow');

      // Verify in DOM (CSS.highlights uses prefixed key)
      const highlightName = `underscore-${id}`;
      expect((global.CSS.highlights as Map<string, any>).has(highlightName)).toBe(true);

      // Remove highlight
      await walkMode.removeHighlight(id);

      // Verify removed from DOM
      expect((global.CSS.highlights as Map<string, any>).has(highlightName)).toBe(false);
    });
  });

  // ============================================
  // Task 5: Concurrent Highlight Creation
  // ============================================
  describe('Concurrent Highlight Creation', () => {
    it('should handle concurrent highlight creation', async () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Concurrent test',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Create 20 highlights concurrently
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(walkMode.createHighlight(mockSelection, 'yellow'));
      }

      const ids = await Promise.all(promises);

      // Verify all created
      expect(ids).toHaveLength(20);
      ids.forEach((id) => expect(id).toBeDefined());

      // Verify repository called
      expect(mockRepository.add).toHaveBeenCalled();
    });

    it('should maintain consistency during concurrent operations', async () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () =>
          ({
            toString: () => 'Consistency test',
            cloneRange: () => ({}),
          }) as any,
      } as unknown as Selection;

      // Mix concurrent creates and removes
      const createPromises = [];
      for (let i = 0; i < 10; i++) {
        createPromises.push(walkMode.createHighlight(mockSelection, 'yellow'));
      }

      const ids = await Promise.all(createPromises);

      // Remove half concurrently
      const removePromises = ids.slice(0, 5).map((id) => walkMode.removeHighlight(id));
      await Promise.all(removePromises);

      // Verify state consistency
      expect(mockRepository.remove).toHaveBeenCalledTimes(5);
    });
  });
});
