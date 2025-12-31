/**
 * Message Bus
 *
 * Coordinates IPC between Popup ↔ Content Script
 * Implements Mediator Pattern
 */

import type { Message } from './message-types';

import type { ModeStateManager } from '@/content/modes/mode-state-manager';
import type { RepositoryFacade } from '@/shared/repositories';
import type { ILogger } from '@/shared/utils/logger';


export class MessageBus {
    /**
     * Setup message handlers in content script
     */
    static setup(
        modeStateManager: ModeStateManager,
        repositoryFacade: RepositoryFacade,
        logger: ILogger
    ): void {
        chrome.runtime.onMessage.addListener(
            (msg: Message, _sender, sendResponse) => {
                this.handleMessage(msg, modeStateManager, repositoryFacade, logger, sendResponse);
                return true; // Async response
            }
        );

        logger.info('[MessageBus] IPC handlers registered');
    }

    private static async handleMessage(
        msg: Message,
        modeStateManager: ModeStateManager,
        repositoryFacade: RepositoryFacade,
        logger: ILogger,
        sendResponse: (response: unknown) => void
    ): Promise<void> {
        try {
            logger.debug('[MessageBus] Received message', { type: msg.type });

            switch (msg.type) {
                case 'GET_MODE':
                    sendResponse({ mode: modeStateManager.getMode() });
                    break;

                case 'SET_MODE':
                    await modeStateManager.setMode(msg.mode);
                    sendResponse({ success: true });
                    break;

                case 'GET_HIGHLIGHT_COUNT':
                    sendResponse({ count: repositoryFacade.count() });
                    break;

                default:
                    sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            logger.error('[MessageBus] Error handling message', error as Error);
            sendResponse({ error: (error as Error).message });
        }
    }
}
