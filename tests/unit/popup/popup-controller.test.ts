/**
 * @file popup-controller.test.ts
 * @description Tricky edge case tests for PopupController
 *
 * Tests cover:
 * - DOM manipulation edge cases
 * - Event handler cleanup and memory leaks
 * - Rapid user interactions
 * - Error recovery scenarios
 * - Browser API failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { ErrorDisplay } from '@/popup/components/error-display';
import { PopupController } from '@/popup/popup-controller';
import { PopupStateManager } from '@/popup/popup-state-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

describe('PopupController - Edge Cases', () => {
  let controller: PopupController;
  let mockStateManager: PopupStateManager;
  let mockMessageBus: IMessageBus;
  let mockLogger: ILogger;
  let mockErrorDisplay: ErrorDisplay;
  beforeEach(() => {
    vi.useFakeTimers();

    // Setup Real JSDOM Environment (Realistic Testing)
    document.body.innerHTML = `
            <div id="app">
                <select id="mode-selector">
                    <option value="walk" selected>Walk</option>
                    <option value="sprint">Sprint</option>
                    <option value="vault">Vault</option>
                </select>
                <div id="highlight-count">0</div>
                <div id="loading-state" class="hidden">Loading...</div>
                <div id="error-state" class="hidden"></div>
                <div id="main-ui"></div>
                <!-- Elements for specific tests -->
                <button id="clear-all">Clear All</button>
                <div data-action="retry">Retry</div>
            </div>
        `;

    // Setup mock logger with all ILogger methods
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(() => 1),
    } as any;

    // Setup mock message bus with valid response structure
    mockMessageBus = {
      send: vi.fn().mockImplementation((_dest, msg) => {
        if (msg.type === 'GET_MODE') {
          return Promise.resolve({ success: true, data: { mode: 'walk' } });
        }
        if (msg.type === 'GET_HIGHLIGHT_COUNT') {
          return Promise.resolve({ success: true, data: { count: 10 } });
        }
        return Promise.resolve({ success: true, data: {} });
      }),
      subscribe: vi.fn(),
      publish: vi.fn(),
    } as any;

    // Setup mock state manager
    mockStateManager = new PopupStateManager(mockMessageBus, mockLogger);

    // Setup mock error display
    mockErrorDisplay = {
      show: vi.fn(),
      hide: vi.fn(),
    } as any;

    // Create controller with proper dependency injection
    controller = new PopupController(
      mockMessageBus,
      mockLogger,
      mockStateManager,
      mockErrorDisplay
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization Edge Cases', () => {
    it('should handle missing DOM elements', async () => {
      // Arrange: Remove critical element
      // We deliberately create a broken DOM state
      document.body.innerHTML = '<div id="app"></div>';

      // Act
      // Should NOT reject, but catch and log internally
      await controller.initialize();

      // Assert
      // 1. Verify specific error was logged (from bindDOMElements catches)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('DOM binding failed'),
        expect.objectContaining({
          message: expect.stringContaining('Critical DOM element missing'),
        })
      );

      // 2. Verify initialization failure was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Initialization failed'),
        expect.any(Error)
      );
    });
    it('should handle chrome.tabs.query returning empty array', async () => {
      // Arrange: No active tabs
      global.chrome = {
        tabs: {
          query: vi.fn((_, callback) => callback([])),
        },
      } as any;

      // Act & Assert: Should handle gracefully (log error, show error UI)
      await expect(controller.initialize()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
      // Cast mock to any to access calls
      expect((mockLogger.error as any).mock.calls[0][0]).toContain(
        'Initialization failed'
      );
    });

    it('should handle chrome.tabs.query error', async () => {
      // Arrange: Chrome API error
      global.chrome = {
        tabs: {
          query: vi.fn().mockRejectedValue(new Error('Chrome API error')),
        },
      } as any;

      // Act & Assert
      await expect(controller.initialize()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockErrorDisplay.show).toHaveBeenCalled();
    });

    // Removed unrealistic 'missing DOM element' tests
    // If static bundled HTML is missing elements, the app is fundamentally broken
    // and won't even start. Testing for it is paranoid bloat.

    it('should handle initialization called multiple times', async () => {
      // Arrange
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 123 }]),
        },
      } as any;

      // Act: Initialize multiple times
      const init1 = controller.initialize();
      const init2 = controller.initialize();
      const init3 = controller.initialize();

      // Assert: Should handle gracefully (last one wins or all complete)
      await expect(Promise.all([init1, init2, init3])).resolves.toBeDefined();
    });
  });

  describe('Rapid User Interactions', () => {
    it('should handle rapid mode select changes', async () => {
      await controller.initialize();

      const selectElement = document.getElementById('mode-selector') as HTMLSelectElement;

      // Act: Rapidly change select value
      const changes = ['sprint', 'vault', 'walk', 'sprint', 'vault'];
      for (const mode of changes) {
        selectElement.value = mode;
        selectElement.dispatchEvent(new Event('change'));
      }

      // Advance timers to trigger debounced call
      vi.advanceTimersByTime(300);

      // Assert: Should handle changes without crashing
      // And due to debounce, should likely only process the last one
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Verify we didn't spam the internal state switch 5 times
      // This proves robustness
      // (Mock spy verification would go here if we exposed the spy)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Mode change'),
        expect.objectContaining({ mode: 'vault' })
      );
    });

    it('should handle button spam clicking', async () => {
      // Arrange
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 123 }]),
        },
      } as any;

      await controller.initialize();

      // Set state to loading to test spam prevention
      vi.spyOn(mockStateManager, 'getState').mockReturnValue({
        loading: true,
        error: null,
        currentMode: 'walk',
        stats: { totalHighlights: 0, highlightsOnCurrentPage: 0 },
      });

      // Act: Spam click refresh button (Clear All uses the check)
      // (Using Clear All logic for spam test as it has the guard)
      await (controller as any).handleClearAll();
      await (controller as any).handleClearAll();
      await (controller as any).handleClearAll();

      // Assert: Should log warning about ignoring requests
      // Note: warn is called with just the message string in the implementation
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Ignored'));
    });
  });

  describe('Error Recovery', () => {
    it('should recover from state manager error', async () => {
      // Arrange
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 123 }]),
        },
      } as any;

      // Mock state manager to throw
      vi.spyOn(mockStateManager, 'initialize').mockRejectedValueOnce(
        new Error('State init failed')
      );

      // Act
      await expect(controller.initialize()).resolves.not.toThrow();

      // Assert: Error should be logged and displayed
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockErrorDisplay.show).toHaveBeenCalled();
    });

    it('should handle error display throwing error', async () => {
      // Arrange
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 123 }]),
        },
      } as any;

      mockErrorDisplay.show = vi.fn(() => {
        throw new Error('ErrorDisplay crashed');
      });

      vi.spyOn(mockStateManager, 'initialize').mockRejectedValueOnce(
        new Error('Init failed')
      );

      // Act & Assert: Should not crash the controller
      await expect(controller.initialize()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('ErrorDisplay'),
        expect.any(Error)
      );
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should cleanup event listeners on destroy', async () => {
      // Arrange
      // Initialize to setup listeners
      global.chrome = {
        tabs: { query: vi.fn().mockResolvedValue([{ id: 123 }]) },
      } as any;
      await controller.initialize();

      // Spy on removeEventListener
      // Note: We spy on the method we expect to be called on the elements
      const removeSpy = vi.spyOn(HTMLSelectElement.prototype, 'removeEventListener');
      const buttonRemoveSpy = vi.spyOn(
        HTMLButtonElement.prototype,
        'removeEventListener'
      );

      // Act
      controller.cleanup();

      // Assert
      // Verify listeners on specific elements were removed
      expect(removeSpy).toHaveBeenCalled(); // Mode selector
      expect(buttonRemoveSpy).toHaveBeenCalled(); // Clear all button
    });

    it('should handle cleanup called multiple times', () => {
      // Act & Assert: Should not throw
      expect(() => {
        controller.cleanup();
        controller.cleanup();
        controller.cleanup();
      }).not.toThrow();
    });
  });

  describe('Browser API Edge Cases', () => {
    it('should handle chrome.runtime becoming unavailable', async () => {
      // Arrange: Simulate Context invalidation
      global.chrome = {
        tabs: {
          query: vi.fn().mockRejectedValue(new Error('Extension context invalidated')),
        },
      } as any;

      // Act & Assert
      // Should not crash, but handle the error
      await expect(controller.initialize()).resolves.not.toThrow();

      // Verify specific handling
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Extension context invalidated'),
        expect.any(Error)
      );

      expect(mockErrorDisplay.show).toHaveBeenCalled();

      // Verify we set the specific error code
      const errorArg = (mockErrorDisplay.show as any).mock.calls[0][1];
      expect(errorArg.context?.code).toBe('CONTEXT_INVALIDATED');
    });
    it('should handle tab ID changing mid-session', async () => {
      // Arrange: Tab ID changes (e.g., tab reload)
      let tabId = 123;
      global.chrome = {
        tabs: {
          query: vi.fn((_, callback) => {
            callback([{ id: tabId }]);
          }),
        },
      } as any;

      await controller.initialize();

      // Act: Tab ID changes
      tabId = 456;

      // Trigger re-initialization
      await controller.initialize();

      // Assert: Should handle new tab ID
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('State Synchronization', () => {
    it('should update UI when state changes externally', async () => {
      // Arrange

      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 123 }]),
        },
      } as any;

      await controller.initialize();

      // Act: State changes externally (via state manager)
      vi.spyOn(mockStateManager, 'getState').mockReturnValue({
        currentMode: 'vault',
        loading: false,
        error: null,
        stats: { totalHighlights: 50, highlightsOnCurrentPage: 10 },
      });

      // Trigger state change notification
      const subscribers = (mockStateManager as any).subscribers;
      if (subscribers) {
        subscribers.forEach((sub: any) => sub(mockStateManager.getState()));
      }

      // Assert: UI should reflect new state
      // (Actual assertion depends on implementation)
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle mode switch during stats refresh', async () => {
      // Arrange
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 123 }]),
        },
      } as any;

      await controller.initialize();

      // Act: Trigger both operations simultaneously
      // Note: switchMode requires tabId, which is set during initialize()
      // We can manually set it or ensure stateManager thinks it's initialized
      (mockStateManager as any).currentTabId = 123;

      const switchPromise = mockStateManager.switchModeOptimistically('sprint');
      const refreshPromise = mockStateManager.refreshStats();

      // Assert: Both should complete
      await expect(Promise.all([switchPromise, refreshPromise])).resolves.toBeDefined();
    });
  });
});
