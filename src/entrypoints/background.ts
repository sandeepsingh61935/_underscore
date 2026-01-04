/**
 * @file background.ts
 * @description Background service worker with TTL cleanup
 */

import { browser } from 'wxt/browser';

import { LoggerFactory } from '@/shared/utils/logger';

const logger = LoggerFactory.getLogger('Background');

export default defineBackground({
  type: 'module',
  async main() {
    logger.info('Background service worker started (Phase 2: Vault Mode)');

    try {
      // Initialize all background services (DI container)
      const { initializeBackground } = await import('@/background/bootstrap');
      await initializeBackground();

      logger.info('Background services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize background services', error as Error);
    }

    // Set up TTL cleanup alarm (every 5 minutes)
    // Legacy/Sprint 1.5 logic - keep for now if needed, or replace with DI-managed job?
    // Keeping it for backward compatibility as per instruction "Migration Service" not done yet.
    browser.alarms.create('ttl-cleanup', { periodInMinutes: 5 });

    // Listen for alarm
    browser.alarms.onAlarm.addListener(async (alarm: unknown) => {
      if ((alarm as { name: string }).name === 'ttl-cleanup') {
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
