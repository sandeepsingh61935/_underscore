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
import { deserializeRange } from '@/shared/utils/range-serializer';
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
                        // PRESERVE EXISTING: Check if selection overlaps existing highlights
                        const overlappingHighlights = getHighlightsInRange(event.selection, store);

                        if (overlappingHighlights.length > 0) {
                            // Existing highlights have PRIORITY - don't create new one
                            logger.info('Selection overlaps existing highlights - preserving existing', {
                                count: overlappingHighlights.length,
                                existingIds: overlappingHighlights.map(h => h.id)
                            });

                            // Don't create new highlight - preserve what's already there
                            return;
                        }

                        // No overlaps - safe to create new highlight
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
                // Deserialize the range to find the correct position
                if (highlightData.range) {
                    const range = deserializeRange(highlightData.range);

                    if (range) {
                        const type = highlightData.type || 'underscore';

                        // Use Custom Highlight API if available
                        if (highlightManager) {
                            // Inject CSS for this highlight
                            injectHighlightCSS(type, highlightData.id, highlightData.color);

                            // Create CSS highlight directly from range
                            const cssHighlight = new Highlight(range);

                            // Use unique name per highlight
                            const highlightName = getHighlightName(type, highlightData.id);
                            CSS.highlights.set(highlightName, cssHighlight);

                            // Add to store
                            store.addFromData({
                                id: highlightData.id,
                                text: highlightData.text,
                                color: highlightData.color,
                                type: type,
                                range: highlightData.range
                            });

                            restored++;
                        } else {
                            // Legacy: create selection and use renderer
                            const selection = window.getSelection();
                            if (selection) {
                                selection.removeAllRanges();
                                selection.addRange(range);

                                const highlight = renderer.createHighlight(
                                    selection,
                                    highlightData.color,
                                    type
                                );

                                if (highlight) {
                                    store.add(highlight);
                                    restored++;
                                } else {
                                    failed++;
                                }

                                selection.removeAllRanges();
                            }
                        }

                        logger.debug('Restored highlight', { id: highlightData.id });
                    } else {
                        logger.warn('Could not deserialize range for highlight', {
                            id: highlightData.id,
                            text: highlightData.text?.substring(0, 30)
                        });
                        failed++;
                    }
                } else {
                    // Legacy highlight without range data
                    logger.warn('Highlight missing range data', { id: highlightData.id });
                    failed++;
                }
            } catch (error) {
                logger.warn('Failed to restore highlight', error as Error);
                failed++;
            }
        }

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
 * (for toggle behavior - remove highlights that overlap with new selection)
 */
function getHighlightsInRange(selection: Selection, store: HighlightStore): Highlight[] {
    if (selection.rangeCount === 0) return [];

    const userRange = selection.getRangeAt(0);
    const highlights = store.getAll();

    return highlights.filter((hl) => {
        if (!hl.liveRange) return false;

        try {
            // Check if ranges overlap
            // Overlaps if: hl ends after selection starts AND hl starts before selection ends
            const hlEndsAfterSelectionStarts = hl.liveRange.compareBoundaryPoints(
                Range.END_TO_START,
                userRange
            ) > 0;

            const hlStartsBeforeSelectionEnds = hl.liveRange.compareBoundaryPoints(
                Range.START_TO_END,
                userRange
            ) < 0;

            return hlEndsAfterSelectionStarts && hlStartsBeforeSelectionEnds;
        } catch (e) {
            // If comparison fails (different documents), no overlap
            return false;
        }
    });
}
