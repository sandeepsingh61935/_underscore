/**
 * @file background.ts
 * @description Background service worker with TTL cleanup
 */

// Polyfill environment removed
import { browser } from 'wxt/browser';

import type { AuthState, IAuthManager, OAuthProviderType } from '@/background/auth/interfaces/i-auth-manager';
import { initializeBackground } from '@/background/bootstrap'; // Static import
import type { Container } from '@/background/di/container';
import { readLocalCollections } from '@/background/services/local-collections-reader';
import { hashDomain, decryptData } from '@/shared/utils/crypto-utils';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { DomainStorage, EventLog, HighlightCreatedEvent } from '@/shared/types/storage';
import { LoggerFactory } from '@/shared/utils/logger';

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

      logger.info('[INIT] Resolving repositoryFacade from container...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const repositoryFacade = container.resolve<any>('repositoryFacade');
      logger.info('[INIT] RepositoryFacade resolved');
      await repositoryFacade.initialize();
      logger.info('[INIT] RepositoryFacade initialized');

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

      // Login Email Handler
      messageBus.subscribe('LOGIN_EMAIL', async (payload: { email?: string; password?: string }) => {
        logger.info('Handling LOGIN_EMAIL request', { email: payload.email });
        if (!payload.email || !payload.password) {
          throw new Error('Email and password are required');
        }

        try {
          const result = await authManager.signInWithEmail(payload.email, payload.password);
          logger.info('AuthManager returned email login result', { success: result.success });

          if (!result.success) {
            const msg = result.error?.message || 'Email login failed (Unknown reason)';
            logger.error('Email login failed explicitly', new Error(msg));
            throw new Error(msg);
          }
          return { success: true, data: { user: result.user } };
        } catch (error) {
          logger.error('Email login handler caught error', error as Error);
          throw error;
        }
      });

      // Register Email Handler
      messageBus.subscribe('REGISTER_EMAIL', async (payload: { email?: string; password?: string }) => {
        logger.info('Handling REGISTER_EMAIL request', { email: payload.email });
        if (!payload.email || !payload.password) {
          throw new Error('Email and password are required');
        }

        try {
          const result = await authManager.signUpWithEmail(payload.email, payload.password);
          logger.info('AuthManager returned email register result', { success: result.success });

          if (!result.success) {
            const msg = result.error?.message || 'Email registration failed (Unknown reason)';
            logger.error('Email registration failed explicitly', new Error(msg));
            throw new Error(msg);
          }
          return { success: true, data: { user: result.user } };
        } catch (error) {
          logger.error('Email registration handler caught error', error as Error);
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

      // --- Collections API handlers ---

      // Get Collections (Grouped by Domain) Handler
      // Reads unified __collections_index: covers Walk (24h TTL), Sprint (permanent), Vault cache
      messageBus.subscribe('GET_COLLECTIONS', async (payload: { mode?: string }) => {
        logger.info('Handling GET_COLLECTIONS request', { mode: payload?.mode });
        try {
          let collections = await readLocalCollections();
          if (payload?.mode) {
            collections = collections.filter(c => c.mode === payload.mode);
          }
          return { success: true, data: { collections } };
        } catch (error) {
          logger.error('GET_COLLECTIONS failed', error as Error);
          throw error;
        }
      });

      // Get Highlights By Domain Handler
      messageBus.subscribe('GET_HIGHLIGHTS_BY_DOMAIN', async (payload: { domain: string }) => {
        logger.info('Handling GET_HIGHLIGHTS_BY_DOMAIN request', { domain: payload.domain });
        if (!payload.domain) {
          throw new Error('Domain required');
        }

        try {
          const hashedKey = await hashDomain(payload.domain);
          const result = await browser.storage.local.get(hashedKey);
          const domainStorage = result[hashedKey] as DomainStorage | undefined;

          if (!domainStorage?.data) {
            return { success: true, data: { highlights: [] } };
          }

          const decrypted = await decryptData(domainStorage.data, payload.domain);
          const eventLog: EventLog = JSON.parse(decrypted);

          // Project events: track created highlights, remove deleted ones
          const highlightMap = new Map<string, HighlightCreatedEvent['data']>();
          for (const event of eventLog.events) {
            if (event.type === 'highlight.created') {
              highlightMap.set(event.data.id, event.data);
            } else if (event.type === 'highlight.removed') {
              highlightMap.delete(event.highlightId);
            } else if (event.type === 'highlights.cleared') {
              highlightMap.clear();
            }
          }

          const highlights = Array.from(highlightMap.values()).map(hl => ({
            id: hl.id,
            text: hl.text,
            url: hl.url ?? '',
            path: hl.url ? new URL(hl.url).pathname : '/',
            createdAt: hl.createdAt,
          })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          return { success: true, data: { highlights } };
        } catch (error) {
          logger.error('GET_HIGHLIGHTS_BY_DOMAIN failed', error as Error);
          throw error;
        }
      });

      // Get Dashboard Data Handler
      messageBus.subscribe('GET_DASHBOARD_DATA', async (payload: { mode?: string }) => {
        logger.info('Handling GET_DASHBOARD_DATA request', { mode: payload?.mode });
        try {
          let collections = await readLocalCollections();
          if (payload?.mode) {
            collections = collections.filter(c => c.mode === payload.mode);
          }
          let totalHighlights = 0;
          let totalDomains = collections.length;
          
          let allRecentHighlights: any[] = [];
          let thisWeekCount = 0;
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

          for (const col of collections) {
            totalHighlights += col.highlightCount;
            
            const hashedKey = await hashDomain(col.domain);
            const result = await browser.storage.local.get(hashedKey);
            const domainStorage = result[hashedKey] as DomainStorage | undefined;
            if (!domainStorage?.data) continue;
            
            const decrypted = await decryptData(domainStorage.data, col.domain);
            const eventLog: EventLog = JSON.parse(decrypted);
            
            const highlightMap = new Map<string, HighlightCreatedEvent['data']>();
            for (const event of eventLog.events) {
              if (event.type === 'highlight.created') {
                highlightMap.set(event.data.id, event.data);
              } else if (event.type === 'highlight.removed') {
                highlightMap.delete(event.highlightId);
              } else if (event.type === 'highlights.cleared') {
                highlightMap.clear();
              }
            }
            
            for (const hl of highlightMap.values()) {
              const createdAt = new Date(hl.createdAt).getTime();
              if (createdAt >= oneWeekAgo) {
                thisWeekCount++;
              }
              allRecentHighlights.push({
                id: hl.id,
                text: hl.text,
                url: hl.url ?? '',
                path: hl.url ? new URL(hl.url).pathname : '/',
                domain: col.domain,
                createdAt: hl.createdAt,
              });
            }
          }
          
          allRecentHighlights.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          return {
            success: true,
            data: {
              totalHighlights,
              totalDomains,
              thisWeekCount,
              recentHighlights: allRecentHighlights.slice(0, 10)
            }
          };
        } catch (error) {
          logger.error('GET_DASHBOARD_DATA failed', error as Error);
          throw error;
        }
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
        const storage = value as { ttl: number | null };
        // null means permanent (Sprint/Vault) — never expire these
        if (storage.ttl !== null && now > storage.ttl) {
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
