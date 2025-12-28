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
import { injectHighlightStyles } from '@/content/styles/highlight-styles';
import { LoggerFactory } from '@/shared/utils/logger';
import { StorageService } from '@/shared/services/storage-service';
import { CommandStack } from '@/shared/patterns/command';
import { deserializeRange } from '@/shared/utils/range-serializer';
import { AnnotationModeManager } from '@/content/annotation-mode-manager';
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

            // Inject CSS styles for Custom Highlight API
            if (useCustomHighlightAPI) {
                injectHighlightStyles();
            }

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
            const modeManager = new AnnotationModeManager(eventBus);

            // ===== PAGE LOAD: Restore highlights from storage =====
            await restoreHighlights(storage, renderer, store, highlightManager);

            // ===== Orchestrate: Listen to selection events =====
            eventBus.on<SelectionCreatedEvent>(
                EventName.SELECTION_CREATED,
                async (event) => {
                    logger.info('Selection detected, creating highlight');

                    try {
                        const color = await colorManager.getCurrentColor();
                        const currentMode = modeManager.getCurrentMode();

                        let highlightData: any = null;

                        // Use Custom Highlight API if available
                        if (highlightManager) {
                            highlightData = highlightManager.createHighlight(
                                event.selection,
                                color,
                                currentMode
                            );
                        } else {
                            // Fallback to legacy renderer
                            highlightData = renderer.createHighlight(
                                event.selection,
                                color,
                                currentMode
                            );
                        }

                        // Check if creation was blocked
                        if (!highlightData) {
                            logger.debug('Selection blocked or failed');
                            return;
                        }

                        // Add to store (works with both old and new format)
                        store.addFromData(highlightData);

                        // Save to storage
                        await storage.saveEvent({
                            type: 'highlight.created',
                            timestamp: Date.now(),
                            eventId: crypto.randomUUID(),
                            data: highlightData
                        });

                        logger.info('Highlight created successfully', {
                            id: highlightData.id,
                            mode: currentMode,
                            api: highlightManager ? 'Custom Highlight API' : 'Legacy'
                        });

                        broadcastCount();
                    } catch (error) {
                        logger.error('Failed to create highlight', error as Error);
                    }
                }
            );

            // ===== Handle highlight removal (click) =====
            eventBus.on(EventName.HIGHLIGHT_CLICKED, async (event) => {
                const highlight = store.get(event.highlightId);
                if (highlight) {
                    // Use Custom Highlight API if available
                    if (highlightManager) {
                        highlightManager.removeHighlight(highlight.id, highlight.type);
                    } else {
                        renderer.removeHighlight(highlight.id);
                    }

                    store.remove(highlight.id);

                    // Save removal event
                    await storage.saveEvent({
                        type: 'highlight.removed',
                        timestamp: Date.now(),
                        eventId: crypto.randomUUID(),
                        highlightId: highlight.id
                    });

                    logger.info('Highlight removed', { id: event.highlightId });
                    broadcastCount();
                }
            });

            // ===== Handle clear selection (double-click) =====
            eventBus.on(EventName.CLEAR_SELECTION, async (event) => {
                const highlightsInSelection = getHighlightsInRange(event.selection, store);

                if (highlightsInSelection.length > 0) {
                    for (const hl of highlightsInSelection) {
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

                // Ctrl+U - Switch to Underscore mode
                else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyU') {
                    e.preventDefault();
                    modeManager.setMode('underscore');
                    logger.info('Switched to underscore mode');
                }

                // Ctrl+H - Switch to Highlight mode
                else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyH') {
                    e.preventDefault();
                    modeManager.setMode('highlight');
                    logger.info('Switched to highlight mode');
                }

                // Ctrl+B - Switch to Box mode
                else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyB') {
                    e.preventDefault();
                    modeManager.setMode('box');
                    logger.info('Switched to box mode');
                }

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
                            // Create CSS highlight directly from range
                            const cssHighlight = new Highlight(range);
                            CSS.highlights.set(type, cssHighlight);

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
 * Get highlights that intersect with a selection range
 */
function getHighlightsInRange(range: Range, store: HighlightStore): any[] {
    const container = range.commonAncestorContainer;
    const parent = container.nodeType === Node.ELEMENT_NODE
        ? container as Element
        : container.parentElement;

    if (!parent) return [];

    const highlightElements = parent.querySelectorAll('.underscore-highlight');
    const highlightsInRange: any[] = [];

    for (const el of Array.from(highlightElements)) {
        if (range.intersectsNode(el)) {
            const id = el.getAttribute('data-id') || (el as any).dataset?.id;
            if (id) {
                const highlight = store.get(id);
                if (highlight) {
                    highlightsInRange.push(highlight);
                }
            }
        }
    }

    return highlightsInRange;
}
