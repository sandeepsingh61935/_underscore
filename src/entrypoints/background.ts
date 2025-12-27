/**
 * @file background.ts
 * @description Background service worker
 */

import { LoggerFactory } from '@/shared/utils/logger';

const logger = LoggerFactory.getLogger('Background');

export default defineBackground({
    type: 'module',
    main() {
        logger.info('Background service worker started');

        // TODO: Handle extension events in future sprints
        // - Storage sync
        // - Context menus
        // - Browser action
    },
});
