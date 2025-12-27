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
import { LoggerFactory } from '@/shared/utils/logger';

const logger = LoggerFactory.getLogger('ContentScript');

// Main content script initialization
export default defineContentScript({
    matches: ['<all_urls>'],

    async main() {
        logger.info('Initializing Web Highlighter Extension...');

        try {
            // Create shared event bus
            const eventBus = new EventBus();

            // Initialize components
            const colorManager = new ColorManager();
            await colorManager.initialize();

            const store = new HighlightStore(eventBus);
            const renderer = new HighlightRenderer(eventBus);
            const detector = new SelectionDetector(eventBus);

            // Orchestrate: Listen to selection events
            eventBus.on<SelectionCreatedEvent>(
                EventName.SELECTION_CREATED,
                async (event) => {
                    logger.info('Selection detected, creating highlight');

                    try {
                        const color = await colorManager.getCurrentColor();
                        const highlight = renderer.createHighlight(event.selection, color);

                        logger.info('Highlight created successfully', {
                            id: highlight.id,
                            color,
                        });
                    } catch (error) {
                        logger.error('Failed to create highlight', error as Error);
                    }
                }
            );

            // Clear all highlights (Ctrl+Shift+U)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.code === 'KeyU') {
                    e.preventDefault();
                    store.clear();
                    renderer.clearAll();
                    logger.info('Cleared all highlights');
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
            logger.info('Ready to highlight! Use double-click or Ctrl+U');
        } catch (error) {
            logger.error('Failed to initialize extension', error as Error);
        }
    },
});
