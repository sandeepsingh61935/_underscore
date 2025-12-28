/**
 * @file entrypoints/content.ts  
 * @description Content script - integrates all highlighting components
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName, SelectionCreatedEvent } from '@/shared/types/events';
import { SelectionDetector } from '@/content/selection-detector';
import { ColorManager } from '@/content/color-manager';
import { HighlightStore } from '@/content/highlight-store';
import { HighlightRenderer } from '@/content/highlight-renderer';
import { HighlightManager } from '@/content/highlight-manager';
import { HighlightClickDetector } from '@/content/highlight-click-detector';
import { injectHighlightCSS, getHighlightName } from '@/content/styles/highlight-styles';
import { LoggerFactory } from '@/shared/utils/logger';
import { StorageService } from '@/shared/services/storage-service';
import { CommandStack } from '@/shared/patterns/command';
import { deserializeRange, serializeRange } from '@/shared/utils/range-serializer';
import { subtractRange, filterTinyRanges, mergeAdjacentRanges } from '@/shared/utils/range-algebra';
import { CreateHighlightCommand, RemoveHighlightCommand, ClearSelectionCommand, ClearAllCommand } from '@/content/commands/simple-highlight-commands';
// Removed: AnnotationModeManager - single mode only
// Note: Command pattern temporarily bypassed for Custom Highlight API
// Commands will be re-integrated for proper undo/redo support

const logger = LoggerFactory.getLogger('ContentScript');

// Main content script initialization
export default defineContentScript({
    matches: ['<all_urls>'],

    async main() {
        logger.info('Initializing Web Highlighter Extension (Sprint 2.0 - Custom Highlight API)...');

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

            const store = new HighlightStore(eventBus);

            // Use new HighlightManager if supported, otherwise fallback to legacy
            const highlightManager = useCustomHighlightAPI
                ? new HighlightManager(eventBus)
                : null;
            const renderer = new HighlightRenderer(eventBus);  // Keep for fallback

            const detector = new SelectionDetector(eventBus);

            // Initialize click detector for double-click deletion
            const clickDetector = new HighlightClickDetector(store, eventBus);
            clickDetector.init();

            // ===== PAGE LOAD: Restore highlights from storage =====
            await restoreHighlights(storage, renderer, store, highlightManager);

            // ===== Orchestrate: Listen to selection events =====
            eventBus.on<SelectionCreatedEvent>(
                EventName.SELECTION_CREATED,
                async (event) => {
                    logger.info('Selection detected, checking for overlaps');

                    try {
                        // RANGE SUBTRACTION: Check if selection overlaps existing highlights
                        const overlappingHighlights = getHighlightsInRange(event.selection, store);

                        if (overlappingHighlights.length > 0) {
                            logger.info('Range subtraction: Splitting overlapping highlights', {
                                count: overlappingHighlights.length
                            });

                            const selectionRange = event.selection.getRangeAt(0);

                            // Process each overlapping highlight
                            for (const existingHighlight of overlappingHighlights) {
                                // Remove the existing highlight first
                                if (highlightManager) {
                                    highlightManager.removeHighlight(existingHighlight.id, existingHighlight.type);
                                }
                                store.remove(existingHighlight.id);

                                // Split each range in the highlight
                                const allRemainingRanges: Range[] = [];

                                for (const liveRange of (existingHighlight.liveRanges || [])) {
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
                                    const text = mergedRanges.map(r => r.toString()).join(' ... ');
                                    const serializedRanges = mergedRanges.map(r => serializeRange(r));

                                    // Generate new ID for split highlight
                                    const newId = `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                                    if (highlightManager) {
                                        // Create visual for each range
                                        const highlightName = getHighlightName(existingHighlight.type, newId);

                                        // CSS Highlight API supports multiple ranges!
                                        const nativeHighlight = new Highlight(...mergedRanges);
                                        CSS.highlights.set(highlightName, nativeHighlight);
                                        highlightManager.registerHighlight(newId, nativeHighlight, mergedRanges[0]);
                                        injectHighlightCSS(existingHighlight.type, newId, existingHighlight.color);
                                    }

                                    // Add to store with multiple ranges
                                    store.addFromData({
                                        id: newId,
                                        text,
                                        color: existingHighlight.color,
                                        type: existingHighlight.type,
                                        ranges: serializedRanges,
                                        liveRanges: mergedRanges
                                    });

                                    // Save event
                                    await storage.saveEvent({
                                        type: 'highlight.created',
                                        timestamp: Date.now(),
                                        eventId: crypto.randomUUID(),
                                        data: {
                                            id: newId,
                                            text,
                                            color: existingHighlight.color,
                                            type: existingHighlight.type,
                                            ranges: serializedRanges
                                        } as any
                                    });

                                    logger.info('Created split highlight', {
                                        id: newId,
                                        rangeCount: mergedRanges.length
                                    });
                                }

                                // Save removal event for original
                                await storage.saveEvent({
                                    type: 'highlight.removed',
                                    timestamp: Date.now(),
                                    eventId: crypto.randomUUID(),
                                    highlightId: existingHighlight.id
                                });
                            }

                            logger.info('Range subtraction complete');
                            broadcastCount();
                            return; // Don't create new highlight
                        }

                        // No overlaps - create new highlight as normal
                        const color = await colorManager.getCurrentColor();

                        const command = new CreateHighlightCommand(
                            event.selection,
                            color,
                            highlightManager || renderer,
                            store,
                            storage
                        );

                        await commandStack.execute(command);

                        logger.info('Highlight created successfully', {
                            api: highlightManager ? 'Custom Highlight API' : 'Legacy'
                        });

                        broadcastCount();
                    } catch (error) {
                        logger.error('Failed to process selection', error as Error);
                    }
                }
            );

            // ===== Handle highlight removal (click) =====
            eventBus.on(EventName.HIGHLIGHT_CLICKED, async (event) => {
                const highlight = store.get(event.highlightId);
                if (highlight) {
                    // Use command for undo/redo support
                    const command = new RemoveHighlightCommand(
                        highlight,
                        highlightManager || renderer,
                        store,
                        storage
                    );

                    await commandStack.execute(command);

                    logger.info('Highlight removed via command', { id: event.highlightId });
                    broadcastCount();
                }
            });

            // ===== Handle clear selection (double-click) =====
            eventBus.on(EventName.CLEAR_SELECTION, async (event) => {
                const highlightsInSelection = getHighlightsInRange(event.selection, store);

                if (highlightsInSelection.length > 0) {
                    for (const hl of highlightsInSelection) {
                        if (highlightManager) {
                            highlightManager.removeHighlight(hl.id);
                        } else {
                            renderer.removeHighlight(hl.id);
                        }
                        store.remove(hl.id);

                        await storage.saveEvent({
                            type: 'highlight.removed',
                            timestamp: Date.now(),
                            eventId: crypto.randomUUID(),
                            highlightId: hl.id
                        });
                    }

                    logger.info('Cleared highlights in selection', {
                        count: highlightsInSelection.length
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
                    const highlights = store.getAll();

                    for (const hl of highlights) {
                        if (highlightManager) {
                            highlightManager.removeHighlight(hl.id, hl.type);
                        } else {
                            renderer.removeHighlight(hl.id);
                        }
                        store.remove(hl.id);

                        await storage.saveEvent({
                            type: 'highlight.removed',
                            timestamp: Date.now(),
                            eventId: crypto.randomUUID(),
                            highlightId: hl.id
                        });
                    }

                    logger.info('Cleared all highlights', { count: highlights.length });
                    broadcastCount();
                }
            });

            // Start detecting selections
            detector.init();

            // Broadcast count updates to popup
            const broadcastCount = () => {
                chrome.runtime.sendMessage({
                    type: 'HIGHLIGHT_COUNT_UPDATE',
                    count: store.count(),
                }).catch(() => {
                    // Popup may not be open, ignore error
                });
            };

            // Listen for count changes
            eventBus.on(EventName.HIGHLIGHT_CREATED, () => broadcastCount());
            eventBus.on(EventName.HIGHLIGHT_REMOVED, () => broadcastCount());
            eventBus.on(EventName.HIGHLIGHTS_CLEARED, () => broadcastCount());

            // Listen for count requests from popup
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.type === 'GET_HIGHLIGHT_COUNT') {
                    sendResponse({ count: store.count() });
                }
                return true; // Keep channel open for async response
            });

            logger.info('Web Highlighter Extension initialized successfully');
            logger.info(`Default color: ${await colorManager.getCurrentColor()}`);
            logger.info('Features: Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y), Storage (4h TTL)');
            logger.info(`Restored ${store.count()} highlights from storage`);
        } catch (error) {
            logger.error('Failed to initialize extension', error as Error);
        }
    },
});

/**
 * Restore highlights from storage on page load
 */
async function restoreHighlights(
    storage: StorageService,
    renderer: HighlightRenderer,
    store: HighlightStore,
    highlightManager?: HighlightManager | null
): Promise<void> {
    try {
        const events = await storage.loadEvents();

        // Replay events to reconstruct state
        const activeHighlights = new Map<string, any>();

        for (const event of events) {
            if (event.type === 'highlight.created' && event.data) {
                activeHighlights.set(event.data.id, event.data);
            } else if (event.type === 'highlight.removed' && event.highlightId) {
                activeHighlights.delete(event.highlightId);
            }
        }

        // Render active highlights at their original positions
        let restored = 0;
        let failed = 0;

        for (const highlightData of activeHighlights.values()) {
            try {
                // Support both old (single range) and new (multi-range) formats
                const serializedRanges = highlightData.ranges || (highlightData.range ? [highlightData.range] : []);

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
                    // Inject CSS for this highlight
                    injectHighlightCSS(type, highlightData.id, highlightData.color);

                    // Create CSS highlight with ALL ranges (multi-range support!)
                    const cssHighlight = new Highlight(...liveRanges);

                    // Use unique name per highlight
                    const highlightName = getHighlightName(type, highlightData.id);
                    CSS.highlights.set(highlightName, cssHighlight);

                    // Add to store with all ranges
                    store.addFromData({
                        id: highlightData.id,
                        text: highlightData.text,
                        color: highlightData.color,
                        type: type,
                        ranges: serializedRanges,
                        liveRanges: liveRanges
                    });

                    restored++;
                } else {
                    // Legacy: only restore first range
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(liveRanges[0]); // Legacy: only first range

                        const command = new CreateHighlightCommand(
                            selection,
                            highlightData.color,
                            renderer,
                            store,
                            storage
                        );

                        await command.execute();
                        restored++;
                    }
                }
            } catch (error) {
                logger.error('Failed to restore highlight', {
                    id: highlightData.id,
                    error: error as Error
                });
                failed++;
            }
        }

        logger.info('Restoration complete', {
            restored,
            failed,
            total: activeHighlights.size
        });

        // Broadcast initial count
        if (failed > 0) {
            logger.warn(`${failed} highlights could not be restored (content may have changed)`);
        }
        logger.info(`Restored ${restored}/${activeHighlights.size} highlights from ${events.length} events`);
    } catch (error) {
        logger.error('Failed to restore highlights', error as Error);
    }
}

/**
 * Find highlights that overlap with a selection
 * (for range subtraction - find all highlights that need to be split)
 */
function getHighlightsInRange(selection: Selection, store: HighlightStore): Array<import('@/content/highlight-store').Highlight> {
    if (selection.rangeCount === 0) return [];

    const userRange = selection.getRangeAt(0);
    const highlights = store.getAll();

    return highlights.filter((hl) => {
        // Check all liveRanges in this highlight
        const ranges = hl.liveRanges || [];
        if (ranges.length === 0) return false;

        // Check if ANY of the highlight's ranges overlap with selection
        for (const liveRange of ranges) {
            try {
                // Check if ranges overlap
                // Overlaps if: hl ends after selection starts AND hl starts before selection ends
                const hlEndsAfterSelectionStarts = liveRange.compareBoundaryPoints(
                    Range.END_TO_START,
                    userRange
                ) > 0;

                const hlStartsBeforeSelectionEnds = liveRange.compareBoundaryPoints(
                    Range.START_TO_END,
                    userRange
                ) < 0;

                if (hlEndsAfterSelectionStarts && hlStartsBeforeSelectionEnds) {
                    return true; // This highlight overlaps
                }
            } catch (e) {
                // If comparison fails (different documents), skip this range
                continue;
            }
        }

        return false; // None of the ranges overlap
    });
}
