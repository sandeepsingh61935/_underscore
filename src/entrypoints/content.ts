/**
 * @file entrypoints/content.ts
 * @description Content script - integrates all highlighting components
 */

import { browser } from 'wxt/browser';

import { ColorManager } from '@/content/color-manager';
import {
  CreateHighlightCommand,
  RemoveHighlightCommand,
} from '@/content/commands/simple-highlight-commands';
import { HighlightClickDetector } from '@/content/highlight-click-detector';
import { HighlightManager } from '@/content/highlight-manager';
import { HighlightRenderer } from '@/content/highlight-renderer';
import type { HighlightDataV2WithRuntime } from '@/content/highlight-type-bridge';
import { ModeManager, SprintMode, WalkMode } from '@/content/modes';
import { setupSelectionDetector } from './content/selection/selection-detector';
import { setupContextMenuListener } from './content/context-menu/context-menu-listener';
import type { HighlightMode } from './shared/types/modes';
import { initializeVaultMode, isVaultModeEnabled } from './content/vault-mode-init';
import { SelectionDetector } from '@/content/selection-detector';
import { deserializeRange, serializeRange } from '@/content/utils/range-converter';
import { CommandStack } from '@/shared/patterns/command';
import { RepositoryFacade, RepositoryFactory } from '@/shared/repositories';
import { StorageService } from '@/shared/services/storage-service';
import type {
  SelectionCreatedEvent,
  HighlightCreatedEvent,
  HighlightRemovedEvent,
  HighlightClickedEvent,
} from '@/shared/types/events';
import { EventName } from '@/shared/types/events';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import {
  subtractRange,
  filterTinyRanges,
  mergeAdjacentRanges,
} from '@/shared/utils/range-algebra';

const logger = LoggerFactory.getLogger('ContentScript');

// Main content script initialization
export default defineContentScript({
  matches: ['<all_urls>'],

  async main() {
    logger.info(
      'Initializing Web Highlighter Extension (Strategy Pattern + Sprint Mode)...'
    );

    try {
      // Check Custom Highlight API support
      const useCustomHighlightAPI = HighlightManager.isSupported();
      logger.info('Custom Highlight API support:', { supported: useCustomHighlightAPI });

      // Create shared event bus
      const eventBus = new EventBus();

      // Initialize storage and command stack
      const storage = new StorageService();
      const commandStack = new CommandStack(50);

      // Initialize components
      const colorManager = new ColorManager();
      await colorManager.initialize();

      // Initialize Repository Facade (Facade Pattern from quality framework)
      const repositoryFacade = new RepositoryFacade();
      await repositoryFacade.initialize(); // Load existing data into cache

      // ===== MODE SYSTEM: Initialize ModeManager and Sprint Mode =====
      const modeManager = new ModeManager(eventBus, logger);

      // ✅ Dependency Injection: Pass shared repository AND storage to mode
      // ✅ Initialize Mode: Default to WALK MODE (Privacy First)
      const sprintMode = new SprintMode(eventBus, logger, repositoryFacade, storage);
      const walkMode = new WalkMode(eventBus, logger, repositoryFacade, storage);

      modeManager.registerMode(sprintMode);
      modeManager.registerMode(walkMode);

      // Default: Walk Mode (No persistence)
      await modeManager.activateMode('walk');
      RepositoryFactory.setMode('walk');

      // Keep old HighlightManager temporarily for compatibility
      const highlightManager = useCustomHighlightAPI
        ? new HighlightManager(eventBus)
        : null;
      console.log('🚀 Underscore Highlighter initializing...');

      // Initialize Vault Mode if enabled
      if (isVaultModeEnabled()) {
        try {
          await initializeVaultMode();
          console.log('✅ Vault Mode ready');
        } catch (error) {
          console.warn('⚠️ Vault Mode initialization failed, falling back to Walk Mode:', error);
        }
      }

      // Setup selection detector for creating highlights
      setupSelectionDetector();eventBus);


// Initialize click detector for double-click deletion
const clickDetector = new HighlightClickDetector(repositoryFacade, eventBus);
clickDetector.init();

// ===== EVENT SOURCING: Wire Event → Mode Handlers (Delegate Pattern) =====
// Observer Pattern: Modes listen to domain events and decide how to handle

// ✅ HIGHLIGHT CREATED: Delegate to mode handler (SRP compliance)
// Mode decides if/how to persist (Walk: NO-OP, Sprint: Event Sourcing)
eventBus.on<HighlightCreatedEvent>(EventName.HIGHLIGHT_CREATED, async (event) => {
  try {
    await modeManager.getCurrentMode().onHighlightCreated(event);
  } catch (error) {
    logger.error('Error in mode highlight created handler:', error as Error);
  }
});

// ✅ HIGHLIGHT REMOVED: Delegate to mode handler (SRP compliance)
// Mode decides if/how to persist removal (Walk: NO-OP, Sprint: Event Sourcing)
eventBus.on<HighlightRemovedEvent>(EventName.HIGHLIGHT_REMOVED, async (event) => {
  try {
    await modeManager.getCurrentMode().onHighlightRemoved(event);
  } catch (error) {
    logger.error('Error in mode highlight removed handler:', error as Error);
  }
});

logger.info('Event-Mode delegation wired', {
  pattern: 'Observer + Delegation (SRP Compliance)',
  listeners: ['HIGHLIGHT_CREATED', 'HIGHLIGHT_REMOVED'],
});

// ===== PAGE LOAD: Restore highlights (Mode decides via shouldRestore())  =====
if (modeManager.getCurrentMode().shouldRestore()) {
  await restoreHighlights({
    storage,
    renderer,
    repositoryFacade,
    highlightManager,
    modeManager,
  });
} else {
  logger.info(`${modeManager.getCurrentMode().name} Mode: Skipping restoration (Ephemeral)`);
}

// ===== Orchestrate: Listen to selection events =====
eventBus.on<SelectionCreatedEvent>(EventName.SELECTION_CREATED, async (event) => {
  logger.info('Selection detected, checking for overlaps');

  try {
    // RANGE SUBTRACTION: Check if selection overlaps existing highlights
    const overlappingHighlights = getHighlightsInRange(
      event.selection,
      repositoryFacade
    );

    if (overlappingHighlights.length > 0) {
      logger.info('Range subtraction: Splitting overlapping highlights', {
        count: overlappingHighlights.length,
      });

      const selectionRange = event.selection.getRangeAt(0);

      // Process each overlapping highlight
      for (const existingHighlight of overlappingHighlights) {
        // Remove the existing highlight first
        if (highlightManager) {
          highlightManager.removeHighlight(existingHighlight.id);
        }
        repositoryFacade.remove(existingHighlight.id);

        // Split each range in the highlight
        const allRemainingRanges: Range[] = [];

        for (const liveRange of existingHighlight.liveRanges || []) {
          // Subtract selection from this range
          const remainingRanges = subtractRange(liveRange, selectionRange);
          allRemainingRanges.push(...remainingRanges);
        }

        // Filter out tiny ranges (< 3 chars)
        const validRanges = filterTinyRanges(allRemainingRanges, 3);

        // Merge adjacent ranges
        const mergedRanges = mergeAdjacentRanges(validRanges);

        if (mergedRanges.length > 0) {
          // Create new highlight(s) from remaining ranges
          const text = mergedRanges.map((r) => r.toString()).join(' ... ');
          const serializedRanges = mergedRanges.map((r) => serializeRange(r));

          // Generate new ID for split highlight
          const newId = `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const { generateContentHash } =
            await import('@/shared/utils/content-hash');
          const contentHash = await generateContentHash(text);

          const highlightData = {
            id: newId,
            text,
            contentHash,
            colorRole: existingHighlight.color || 'yellow',
            type: 'underscore' as const,
            ranges: serializedRanges,
            liveRanges: mergedRanges,
            createdAt: new Date(),
          };

          // ✅ Use mode's unified creation path (fixes undo/redo!)
          await modeManager.createFromData(highlightData);

          // Add to repository for persistence
          repositoryFacade.addFromData(highlightData);

          // Save event
          await storage.saveEvent({
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: {
              id: newId,
              text,
              type: existingHighlight.type,
              ranges: serializedRanges,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });

          logger.info('Created split highlight', {
            id: newId,
            rangeCount: mergedRanges.length,
          });
        }

        // Save removal event for original
        await storage.saveEvent({
          type: 'highlight.removed',
          timestamp: Date.now(),
          eventId: crypto.randomUUID(),
          highlightId: existingHighlight.id,
        });
      }

      logger.info('Range subtraction complete');
      broadcastCount();
      return; // Don't create new highlight
    }

    // No overlaps - create new highlight as normal
    const colorRole = await colorManager.getCurrentColorRole();

    const command = new CreateHighlightCommand(
      event.selection,
      colorRole,
      modeManager, // ✅ Use mode manager!
      repositoryFacade,
      storage
    );

    await commandStack.execute(command);

    logger.info('Highlight created successfully', {
      api: highlightManager ? 'Custom Highlight API' : 'Legacy',
    });

    broadcastCount();
  } catch (error) {
    logger.error('Failed to process selection', error as Error);
  }
});

// ===== Handle highlight removal (click) =====
eventBus.on<HighlightClickedEvent>(EventName.HIGHLIGHT_CLICKED, async (event) => {
  const highlight = repositoryFacade.get(event.highlightId);
  if (highlight) {
    // Use command for undo/redo support
    const command = new RemoveHighlightCommand(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlight as any, // Legacy highlight type
      modeManager, // ✅ Use mode manager!
      repositoryFacade,
      storage
    );

    await commandStack.execute(command);

    logger.info('Highlight removed via command', { id: event.highlightId });
    broadcastCount();
  }
});

// ===== Handle clear selection (double-click) =====
eventBus.on<SelectionCreatedEvent>(EventName.CLEAR_SELECTION, async (event) => {
  const highlightsInSelection = getHighlightsInRange(
    event.selection,
    repositoryFacade
  );

  if (highlightsInSelection.length > 0) {
    for (const hl of highlightsInSelection) {
      // ✅ Use mode manager's unified removal
      await modeManager.removeHighlight(hl.id);

      repositoryFacade.remove(hl.id);

      await storage.saveEvent({
        type: 'highlight.removed',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        highlightId: hl.id,
      });
    }

    logger.info('Cleared highlights in selection', {
      count: highlightsInSelection.length,
    });
    broadcastCount();
  }
});

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', async (e) => {
  // Ctrl+Z - Undo
  if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
    e.preventDefault();
    if (commandStack.canUndo()) {
      await commandStack.undo();
      logger.info('Undo executed');
      broadcastCount();
    }
  }

  // Ctrl+Shift+Z - Redo
  else if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ') {
    e.preventDefault();
    if (commandStack.canRedo()) {
      await commandStack.redo();
      logger.info('Redo executed');
      broadcastCount();
    }
  }

  // Ctrl+Y - Redo (Windows/Linux standard)
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyY') {
    e.preventDefault();
    if (commandStack.canRedo()) {
      await commandStack.redo();
      logger.info('Redo executed (Ctrl+Y)');
      broadcastCount();
    }
  }

  // Removed: mode switching shortcuts (Ctrl+U/H/B) - single mode only

  // Ctrl+Shift+U - Clear all
  else if (e.ctrlKey && e.shiftKey && e.code === 'KeyU') {
    e.preventDefault();

    const count = repositoryFacade.count();

    // ✅ Call mode's clearAll (clears CSS.highlights + state + repo)
    await modeManager.getCurrentMode().clearAll();

    // ❌ DON'T clear storage!
    // This would wipe ALL events including creation events
    // Let event sourcing handle it naturally

    logger.info('Cleared all highlights', { count });
    broadcastCount();
  }
});

// Start detecting selections
detector.init();

// Broadcast count updates to popup
const broadcastCount = (): void => {
  browser.runtime
    .sendMessage({
      type: 'HIGHLIGHT_COUNT_UPDATE',
      count: repositoryFacade.count(),
    })
    .catch(() => {
      // Popup may not be open, ignore error
    });
};

// Listen for count changes
eventBus.on(EventName.HIGHLIGHT_CREATED, () => broadcastCount());
eventBus.on(EventName.HIGHLIGHT_REMOVED, () => broadcastCount());
eventBus.on(EventName.HIGHLIGHTS_CLEARED, () => broadcastCount());

// Listen for count/mode requests from popup
browser.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: unknown,
    sendResponse: (response: unknown) => void
  ) => {
    const msg = message as { type: string; mode?: 'walk' | 'sprint' };

    if (msg && msg.type === 'GET_HIGHLIGHT_COUNT') {
      sendResponse({ count: repositoryFacade.count() });
    }

    else if (msg && msg.type === 'GET_MODE') {
      sendResponse({ mode: RepositoryFactory.getMode() });
    }

    else if (msg && msg.type === 'SET_MODE' && msg.mode) {
      const newMode = msg.mode;
      logger.info(`Switching to ${newMode} mode`);

      (async () => {
        // Switch mode logic
        await modeManager.activateMode(newMode);
        RepositoryFactory.setMode(newMode);

        if (newMode === 'sprint') {
          // Restore if switching to Sprint
          await restoreHighlights({
            storage,
            renderer,
            repositoryFacade,
            highlightManager,
            modeManager,
          });
        } else {
          // Clear highlights if switching to Walk (Incognito)
          // User expects privacy when toggling to Walk Mode
          await modeManager.getCurrentMode().clearAll();
        }

        // Broadcast update
        sendResponse({ success: true, mode: newMode });
      })();

      return true; // Async response
    }

    return true; // Keep channel open for async response
  }
);

logger.info('Web Highlighter Extension initialized successfully');
logger.info(`Default color role: ${await colorManager.getCurrentColorRole()}`);
logger.info(
  'Features: Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y), Storage (4h TTL)'
);
logger.info(`Restored ${repositoryFacade.count()} highlights from storage`);
    } catch (error) {
  logger.error('Failed to initialize extension', error as Error);
}
  },
});

/**
 * Restore highlights from storage on page load
 */
interface RestoreContext {
  storage: StorageService;
  renderer: HighlightRenderer;
  repositoryFacade: RepositoryFacade;
  highlightManager: HighlightManager | null;
  modeManager: ModeManager;
}

/**
 * Restore highlights from storage on page load
 */
async function restoreHighlights(context: RestoreContext): Promise<void> {
  const { storage, renderer, repositoryFacade, highlightManager, modeManager } = context;
  try {
    const events = await storage.loadEvents();

    // ✅ PURE EVENT SOURCING: Clear projection before rebuilding
    // This ensures repository is a true projection of events, not a persistent cache
    repositoryFacade.clear();
    logger.info('🧹 Cleared repository projection before event replay');

    // Replay events to reconstruct state
    const activeHighlights = new Map<string, HighlightDataV2WithRuntime>();

    logger.warn(`🔥 Processing ${events.length} events to rebuild state...`);

    for (const event of events) {
      logger.warn(`🔥 Event type: ${event.type}`, event);

      // ✅ Handle CLEAR ALL event (waterline - discard all previous highlights)
      if (event.type === 'highlights.cleared') {
        logger.info('🧹 CLEAR ALL event detected - discarding all highlights', {
          previousCount: activeHighlights.size,
        });
        activeHighlights.clear();
        continue;
      }

      if (event.type === 'highlight.created' && event.data) {
        activeHighlights.set(event.data.id, event.data as HighlightDataV2WithRuntime);
        logger.warn(`✅ Added highlight to map: ${event.data.id}`);
      } else if (event.type === 'highlight.removed' && event.highlightId) {
        activeHighlights.delete(event.highlightId);
        logger.warn(`🗑️ Removed highlight from map: ${event.highlightId}`);
      } else {
        logger.error(`❌ Event didn't match expected format: ${event.type}`);
      }
    }

    logger.warn(`🎯 Final map size: ${activeHighlights.size} highlights to restore`);

    // Render active highlights at their original positions
    let restored = 0;
    let failed = 0;

    for (const highlightData of activeHighlights.values()) {
      try {
        // Support both old (single range) and new (multi-range) formats
        // Cast to any to access legacy 'range' property if present
        const legacyData = highlightData as unknown as Record<string, unknown>;
        const serializedRanges =
          highlightData.ranges || (legacyData['range'] ? [legacyData['range']] : []);

        if (serializedRanges.length === 0) {
          logger.warn('No ranges to restore', { id: highlightData.id });
          failed++;
          continue;
        }

        // Deserialize all ranges
        const liveRanges: Range[] = [];
        for (const serializedRange of serializedRanges) {
          const range = deserializeRange(serializedRange);
          if (range) {
            liveRanges.push(range);
          }
        }

        if (liveRanges.length === 0) {
          logger.warn('Failed to deserialize any ranges', { id: highlightData.id });
          failed++;
          continue;
        }

        const type = highlightData.type || 'underscore';

        // Use Custom Highlight API if available
        if (highlightManager) {
          // ✅ CRITICAL FIX: Use mode's unified creation path!
          // This ensures the highlight is registered in mode's internal maps
          const { generateContentHash } = await import('@/shared/utils/content-hash');
          const contentHash = await generateContentHash(highlightData.text);

          await modeManager.createFromData({
            id: highlightData.id,
            text: highlightData.text,
            contentHash,
            colorRole: highlightData.color || 'yellow',
            type: 'underscore' as const,
            ranges: serializedRanges,
            liveRanges: liveRanges,
            createdAt: highlightData.createdAt,
          });

          // Add to repository for persistence tracking
          repositoryFacade.addFromData({
            id: highlightData.id,
            text: highlightData.text,
            color: highlightData.color,
            type: type,
            ranges: serializedRanges,
            liveRanges: liveRanges,
          });

          restored++;
        } else {
          // Legacy: only restore first range
          const selection = window.getSelection();
          if (selection && liveRanges[0]) {
            selection.removeAllRanges();
            selection.addRange(liveRanges[0]); // Legacy: only first range

            const createCommand = new CreateHighlightCommand(
              selection,
              highlightData.color || 'yellow', // Use semantic token
              renderer,
              repositoryFacade,
              storage
            );

            await createCommand.execute();
            restored++;
          }
        }
      } catch (error) {
        logger.error('Failed to restore highlight', error as Error, {
          id: highlightData.id,
        });
        failed++;
      }
    }

    logger.info('Restoration complete', {
      restored,
      failed,
      total: activeHighlights.size,
    });

    // Broadcast initial count
    if (failed > 0) {
      logger.warn(
        `${failed} highlights could not be restored (content may have changed)`
      );
    }
    logger.info(
      `Restored ${restored}/${activeHighlights.size} highlights from ${events.length} events`
    );
  } catch (error) {
    logger.error('Failed to restore highlights', error as Error);
  }
}

/**
 * Find highlights that overlap with a selection
 * (for range subtraction - find all highlights that need to be split)
 */
function getHighlightsInRange(
  selection: Selection,
  repositoryFacade: RepositoryFacade
): Array<HighlightDataV2WithRuntime> {
  if (selection.rangeCount === 0) return [];

  const userRange = selection.getRangeAt(0);
  const highlights = repositoryFacade.getAll();

  return (highlights as unknown as HighlightDataV2WithRuntime[]).filter((hl) => {
    // Check all liveRanges in this highlight
    const ranges = hl.liveRanges || [];
    if (ranges.length === 0) return false;

    // Check if ANY of the highlight's ranges overlap with selection
    for (const liveRange of ranges) {
      try {
        // Check if ranges overlap
        // Overlaps if: hl ends after selection starts AND hl starts before selection ends
        const hlEndsAfterSelectionStarts =
          liveRange.compareBoundaryPoints(Range.END_TO_START, userRange) > 0;

        const hlStartsBeforeSelectionEnds =
          liveRange.compareBoundaryPoints(Range.START_TO_END, userRange) < 0;

        if (hlEndsAfterSelectionStarts && hlStartsBeforeSelectionEnds) {
          return true; // This highlight overlaps
        }
      } catch (_e) {
        // If comparison fails (different documents), skip this range
        continue;
      }
    }

    return false; // None of the ranges overlap
  });
}
