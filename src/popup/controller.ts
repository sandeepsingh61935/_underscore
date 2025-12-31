/**
 * Popup Controller
 *
 * Handles UI interactions in popup for mode switching
 */

import type { ModeType } from '@/content/modes/mode-state-manager';
import type { Message } from '@/shared/messaging/message-types';

export class PopupController {
    private modeSelector: HTMLSelectElement | null = null;
    private highlightCount: HTMLElement | null = null;
    private currentTab: chrome.tabs.Tab | null = null;

    async init(): Promise<void> {
        // Get DOM elements
        this.modeSelector = document.getElementById('mode-selector') as unknown as HTMLSelectElement;
        this.highlightCount = document.getElementById('highlight-count') as unknown as HTMLElement;

        if (!this.modeSelector || !this.highlightCount) {
            console.error('[Popup] Required elements not found');
            return;
        }

        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            console.error('[Popup] No active tab');
            return;
        }
        this.currentTab = tab;

        // Load current mode
        await this.loadCurrentMode();

        // Setup event listeners
        this.modeSelector.addEventListener('change', () => this.handleModeChange());

        // Listen for mode updates from content script
        chrome.runtime.onMessage.addListener((msg: Message) => {
            if (msg.type === 'MODE_CHANGED') {
                this.modeSelector!.value = msg.mode;
            } else if (msg.type === 'HIGHLIGHT_COUNT_UPDATE') {
                this.highlightCount!.textContent = msg.count.toString();
            }
        });

        // Update count periodically
        await this.updateCount();
        setInterval(() => this.updateCount(), 1000);
    }

    private async loadCurrentMode(): Promise<void> {
        if (!this.currentTab?.id || !this.modeSelector) return;

        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: 'GET_MODE',
            } as unknown as Message);

            if (response && 'mode' in response) {
                this.modeSelector.value = response.mode;
            }
        } catch (error) {
            console.error('[Popup] Failed to load mode:', error);
        }
    }

    private async handleModeChange(): Promise<void> {
        if (!this.currentTab?.id || !this.modeSelector) return;

        const mode = this.modeSelector.value as ModeType;

        try {
            await chrome.tabs.sendMessage(this.currentTab.id, {
                type: 'SET_MODE',
                mode,
            } as unknown as Message);

            // eslint-disable-next-line no-console
            console.log('[Popup] Mode switched to:', mode);
        } catch (error) {
            console.error('[Popup] Failed to switch mode:', error);
        }
    }

    private async updateCount(): Promise<void> {
        if (!this.currentTab?.id || !this.highlightCount) return;

        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: 'GET_HIGHLIGHT_COUNT',
            } as unknown as Message);

            if (response && 'count' in response) {
                this.highlightCount.textContent = response.count.toString();
            }
        } catch (_error) {
            // Content script might not be loaded yet, ignore
        }
    }
}
