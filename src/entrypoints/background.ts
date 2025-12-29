/**
 * @file background.ts
 * @description Background service worker with TTL cleanup
 */

import { browser } from 'wxt/browser';
import { LoggerFactory } from '@/shared/utils/logger';

const logger = LoggerFactory.getLogger('Background');

export default defineBackground({
    type: 'module',
    main() {
        logger.info('Background service worker started (Sprint 1.5)');

        // Set up TTL cleanup alarm (every 5 minutes)
        browser.alarms.create('ttl-cleanup', { periodInMinutes: 5 });

        // Listen for alarm
        browser.alarms.onAlarm.addListener(async (alarm: any) => {
            if (alarm.name === 'ttl-cleanup') {
                await cleanupExpiredDomains();
            }
        });

        // Also cleanup on browser startup
        browser.runtime.onStartup.addListener(async () => {
            logger.info('Browser startup detected, running cleanup');
            await cleanupExpiredDomains();
        });

        // Run initial cleanup on extension install/update
        cleanupExpiredDomains();
    },
});

/**
 * Cleanup expired domains from storage
 * Removes all domains where TTL has passed
 */
async function cleanupExpiredDomains(): Promise<void> {
    try {
        const all = await browser.storage.local.get(null);
        const now = Date.now();
        const expired: string[] = [];

        for (const [key, value] of Object.entries(all)) {
            // Check if it's our storage format and has TTL
            if (value && typeof value === 'object' && 'ttl' in value) {
                const storage = value as { ttl: number };
                if (now > storage.ttl) {
                    expired.push(key);
                }
            }
        }

        if (expired.length > 0) {
            await browser.storage.local.remove(expired);
            logger.info(`[Cleanup] Removed ${expired.length} expired domains`);
        } else {
            logger.debug('[Cleanup] No expired domains found');
        }
    } catch (error) {
        logger.error('[Cleanup] Failed to cleanup expired domains', error as Error);
    }
}

