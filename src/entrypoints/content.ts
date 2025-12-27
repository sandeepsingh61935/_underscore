/**
 * @file entrypoints/content.ts
 * @description Content script entry point - runs on web pages
 */

import { LoggerFactory } from '@/shared/utils/logger';
import { defineContentScript } from 'wxt/client';

const logger = LoggerFactory.getLogger('ContentScript');

// Main content script initialization
export default defineContentScript({
    matches: ['<all_urls>'],

    main() {
        logger.info('Content script loaded');

        // TODO: Initialize Sprint Mode in Sprint 1
        // - Selection detector
        // - Highlight renderer
        // - Keyboard shortcuts
    },
});
