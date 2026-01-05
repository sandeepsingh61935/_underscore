/**
 * @file background.ts
 * @description Background service worker with TTL cleanup
 */

import '@/background/utils/polyfill'; // Polyfill environment first
import { browser } from 'wxt/browser';

import { LoggerFactory } from '@/shared/utils/logger';

import { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { IAuthManager, OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';
import type { AuthState } from '@/background/auth/interfaces/i-auth-manager';

import { Container } from '@/background/di/container';
import { initializeBackground } from '@/background/bootstrap'; // Static import

const logger = LoggerFactory.getLogger('Background');

export default defineBackground({
  type: 'module',
  async main() {
    logger.info('Background service worker started (Phase 2: Vault Mode)');

    let container: Container;
    let messageBus: IMessageBus;
    let authManager: IAuthManager;

    try {
      // Initialize all background services (DI container)
      logger.info('[INIT] Starting background service initialization...');
      // Static import used

      logger.info('[INIT] Bootstrap module loaded, calling initializeBackground...');
      container = await initializeBackground();
      logger.info('[INIT] Container initialized successfully');

      // CRITICAL: Register Auth IPC handlers immediately after container init
      // This must happen synchronously to prevent "Receiving end does not exist" errors
      // when popup sends LOGIN/LOGOUT messages before handlers are ready
      logger.info('[INIT] Resolving messageBus from container...');
      messageBus = container.resolve<IMessageBus>('messageBus');
      logger.info('[INIT] MessageBus resolved');

      logger.info('[INIT] Resolving authManager from container...');
      authManager = container.resolve<IAuthManager>('authManager');
      logger.info('[INIT] AuthManager resolved');

      // Login Handler
      messageBus.subscribe('LOGIN', async (payload: { provider: OAuthProviderType }) => {
        logger.info('Handling LOGIN request', { payload });
        try {
          const result = await authManager.signIn(payload.provider);
          logger.info('AuthManager returned result', { success: result.success });

          if (!result.success) {
            const msg = result.error?.message || 'Login failed (Unknown reason)';
            logger.error('Login failed explicitly', new Error(msg));
            throw new Error(msg);
          }
          return { success: true, data: { user: result.user } };
        } catch (error) {
          logger.error('Login handler caught error', error as Error);
          // Re-throw to let MessageBus handle it, but ensure message is preserved
          throw error;
        }
      });

      // Logout Handler
      messageBus.subscribe('LOGOUT', async () => {
        logger.info('Handling LOGOUT request');
        await authManager.signOut();
        return { success: true, data: {} };
      });

      // Get Auth State Handler
      messageBus.subscribe('GET_AUTH_STATE', async () => {
        const state = authManager.getAuthState();
        return {
          success: true,
          data: {
            isAuthenticated: state.isAuthenticated,
            user: state.user,
            provider: state.provider
          }
        };
      });

      // Forward Auth State Changes to Popup (via broadcast)
      authManager.onAuthStateChanged((state: AuthState) => {
        messageBus.publish('AUTH_STATE_CHANGED', {
          isAuthenticated: state.isAuthenticated,
          user: state.user
        });
      });

      logger.info('Auth IPC handlers registered');
      logger.info('Background services initialized successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize background services', err);
      if (err.stack) {
        logger.info('[INIT] Error stack: ' + err.stack);
      }

      // CRITICAL: Don't return early - we need to keep the service worker alive
      // and provide error responses to the popup
      // Register fallback error handlers so popup gets a response instead of timeout
      logger.warn('[INIT] Registering fallback error handlers...');

      // Fallback listener to respond to messages when DI container failed
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        logger.error('[FALLBACK] Received message during failed state', undefined, {
          type: message.type,
          senderId: sender.id
        });

        // Reply with error to any message
        const response = {
          success: false,
          error: `Background initialization failed: ${(error as Error).message}. Check console logs.`,
          code: 'INIT_FAILED'
        };

        try {
          sendResponse(response);
        } catch (e) {
          logger.error('[FALLBACK] Failed to send response', e as Error);
        }

        return true; // Keep channel open
      });

      return; // Stop processing but keep SW alive with fallback listener
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
