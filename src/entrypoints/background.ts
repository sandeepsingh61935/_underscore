/**
 * @file background.ts
 * @description Background service worker with TTL cleanup
 */

// Polyfill environment removed
import { browser } from 'wxt/browser';

import type { IAuthManager, OAuthProviderType, AuthState } from '@/background/auth/interfaces/i-auth-manager';
import { initializeBackground } from '@/background/bootstrap';
import type { Container } from '@/background/di/container';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { authStateResponseData } from '@/shared/auth/auth-state-payload';
import { broadcastAuthSessionCleared, broadcastAuthStateChange } from '@/shared/auth/broadcast-auth-state';
import { CLEAR_VERIFICATION_STATE, SYNC_AUTH_SESSION } from '@/shared/auth/constants';
import { SyncAuthSessionPayloadSchema } from '@/shared/schemas/auth-schemas';
import { toExportableHighlight, type ExportScope } from '@/shared/highlight-export';
import { LoggerFactory } from '@/shared/utils/logger';
import { BackgroundHighlightOrchestrator } from '@/background/services/background-highlight-orchestrator';
import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import { AiOrchestrator } from '@/background/services/llm/ai-orchestrator';
import { SYNC_LIBRARY, GET_EXPORTABLE_HIGHLIGHTS, UPDATE_HIGHLIGHT_METADATA, IPC_HIGHLIGHT_DELETE_SCOPE, IPC_HIGHLIGHT_UNDO_DELETE, CLEAR_HIGHLIGHT_DATA } from '@/shared/schemas/message-schemas';
import { HighlightDeleteService, type DeleteRequest } from '@/background/services/highlight-delete-service';
import { buildHighlightMetadataUpdate } from '@/shared/utils/highlight-metadata';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import { McpBridgeHandler } from '@/background/services/mcp-bridge-handler';
import { McpBridgeClientService } from '@/background/services/mcp-bridge-client-service';
import { createScopedHighlightQueryService } from '@/background/services/scoped-highlight-query';
import type { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import { resolveConfiguredProvider } from '@/background/services/llm/llm-provider-factory';
import type { LLMRegistry } from '@/background/services/llm/llm-registry';
import { LlmKeyStoreHolder } from '@/background/services/llm/llm-key-store-holder';
import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import { MODE_STORAGE_KEY } from '@/shared/constants/mode-storage';
import { normalizeMode } from '@/shared/utils/normalize-mode';
import { getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';
import { clearHighlightData } from '@/background/services/clear-highlight-data';

const logger = LoggerFactory.getLogger('Background');

export default defineBackground({
  type: 'module',
  async main() {
    logger.info('Background service worker started');

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

      // Initialize the highlight bridge orchestrator (subscribes to IPC_HIGHLIGHT_*)
      const backgroundHighlightOrchestrator = container.resolve<BackgroundHighlightOrchestrator>('backgroundHighlightOrchestrator');
      backgroundHighlightOrchestrator.initialize();
      logger.info('[INIT] BackgroundHighlightOrchestrator initialized');

      const aiOrchestrator = container.resolve<AiOrchestrator>('aiOrchestrator');
      const scopedHighlightRepositoryForAi = container.resolve<ScopedHighlightRepository>('scopedHighlightRepository');
      aiOrchestrator.configureFeatureGate(async () => {
        const stored = await browser.storage.local.get(MODE_STORAGE_KEY);
        const mode = normalizeMode(stored[MODE_STORAGE_KEY]);
        return {
          mode,
          capabilities: getCapabilitiesForMode(mode),
          isAuthenticated: authManager.isAuthenticated,
          storageScope: scopedHighlightRepositoryForAi.getActiveScope(),
        };
      });
      aiOrchestrator.initialize();
      logger.info('[INIT] AiOrchestrator initialized');

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
          return { success: true, data: authStateResponseData(authManager.getAuthState()) };
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
          return { success: true, data: authStateResponseData(authManager.getAuthState()) };
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
          return { success: true, data: authStateResponseData(authManager.getAuthState()) };
        } catch (error) {
          logger.error('Email registration handler caught error', error as Error);
          throw error;
        }
      });
      // Logout Handler
      messageBus.subscribe('LOGOUT', async () => {
        logger.info('Handling LOGOUT request');
        await authManager.signOut();
        broadcastAuthSessionCleared();
        return { success: true, data: authStateResponseData(authManager.getAuthState()) };
      });

      // Get Auth State Handler
      messageBus.subscribe('GET_AUTH_STATE', async () => {
        const state = authManager.getAuthState();
        return {
          success: true,
          data: authStateResponseData(state),
        };
      });

      messageBus.subscribe(CLEAR_VERIFICATION_STATE, async () => {
        logger.info('Handling CLEAR_VERIFICATION_STATE request');
        await authManager.clearVerificationState();
        return {
          success: true,
          data: authStateResponseData(authManager.getAuthState()),
        };
      });

      messageBus.subscribe(SYNC_AUTH_SESSION, async (payload: unknown) => {
        logger.info('Handling SYNC_AUTH_SESSION request');
        const parsed = SyncAuthSessionPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return { success: false, error: 'Invalid session payload', code: 'INVALID_PAYLOAD' };
        }

        if (parsed.data === null) {
          await authManager.signOut();
          broadcastAuthSessionCleared();
          return { success: true, data: {} };
        }

        const result = await authManager.setSession(
          parsed.data.access_token,
          parsed.data.refresh_token,
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error?.message ?? 'Failed to sync session',
            code: result.error?.code,
          };
        }

        return {
          success: true,
          data: authStateResponseData(authManager.getAuthState()),
        };
      });

      // Forward Auth State Changes to popup, content scripts, and web tabs
      authManager.onAuthStateChanged((state: AuthState) => {
        broadcastAuthStateChange(state);
      });

      // --- Collections API handlers ---

      const scopedHighlightRepository = container.resolve<ScopedHighlightRepository>('scopedHighlightRepository');

      const getHighlightQueryService = () => createScopedHighlightQueryService({
        isAuthenticated: authManager.isAuthenticated,
        repositoryFacade,
        scopedHighlightRepository,
      });

      const cloudHydrationService = container.resolve<ICloudHydrationService>('cloudHydrationService');

      const librarySyncCursor = container.resolve<LibrarySyncCursor>('librarySyncCursor');
      const llmRegistry = container.resolve<LLMRegistry>('llmRegistry');
      const llmKeyStoreHolder = container.resolve<LlmKeyStoreHolder>('llmKeyStoreHolder');

      const mcpBridgeHandler = new McpBridgeHandler({
        authManager,
        getHighlightQueryService,
        backgroundHighlightOrchestrator,
        scopedHighlightRepository,
        repositoryFacade,
        cloudHydrationService,
        librarySyncCursor,
        llmChat: async (payload: { provider?: ProviderName; request: LLMRequest }) => {
          const instance = await resolveConfiguredProvider(llmRegistry, llmKeyStoreHolder.get(), payload.provider);
          const result = await instance.chat(payload.request);
          return { text: result.text };
        },
      });
      const mcpBridgeClient = new McpBridgeClientService(mcpBridgeHandler, logger);
      mcpBridgeClient.start();
      logger.info('[INIT] McpBridgeClientService started');

      // Manual library sync (Settings → Sync library)
      messageBus.subscribe(SYNC_LIBRARY, async () => {
        logger.info('Handling SYNC_LIBRARY request');
        try {
          if (!authManager.isAuthenticated) {
            return { success: false, error: 'Sign in to sync library with cloud' };
          }
          const result = await cloudHydrationService.hydrate();
          if (result.error) {
            return { success: false, error: result.error };
          }
          return { success: true, data: result };
        } catch (error) {
          logger.error('SYNC_LIBRARY failed', error as Error);
          throw error;
        }
      });

      // Get Collections (Grouped by Domain) Handler
      messageBus.subscribe('GET_COLLECTIONS', async (payload: { mode?: string }) => {
        logger.info('Handling GET_COLLECTIONS request', { mode: payload?.mode });
        try {
          const collections = await getHighlightQueryService().getCollections(payload?.mode);
          return { success: true, data: { collections } };
        } catch (error) {
          logger.error('GET_COLLECTIONS failed', error as Error);
          throw error;
        }
      });

      // Get Highlights By Domain Handler
      messageBus.subscribe('GET_HIGHLIGHTS_BY_DOMAIN', async (payload: { domain: string }) => {
        logger.info('Handling GET_HIGHLIGHTS_BY_DOMAIN request', { domain: payload.domain });
        try {
          const highlights = await getHighlightQueryService().getHighlightsByDomain(payload.domain);
          const withPlaintext = await backgroundHighlightOrchestrator.enrichWithPlaintext(highlights);
          return { success: true, data: { highlights: withPlaintext } };
        } catch (error) {
          logger.error('GET_HIGHLIGHTS_BY_DOMAIN failed', error as Error);
          throw error;
        }
      });

      messageBus.subscribe(CLEAR_HIGHLIGHT_DATA, async () => {
        logger.info('Handling CLEAR_HIGHLIGHT_DATA request');
        try {
          const result = await clearHighlightData(
            repositoryFacade,
            scopedHighlightRepository,
            logger,
          );
          notifyLibraryDataChanged({ source: 'clear-highlight-data' });
          return { success: true, data: result };
        } catch (error) {
          logger.error('CLEAR_HIGHLIGHT_DATA failed', error as Error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      messageBus.subscribe(UPDATE_HIGHLIGHT_METADATA, async (payload: {
        id: string;
        notes?: string;
        tags?: string[];
      }) => {
        logger.info('Handling UPDATE_HIGHLIGHT_METADATA request', { id: payload.id });
        try {
          const metadata = buildHighlightMetadataUpdate({
            notes: payload.notes,
            tags: payload.tags,
          });
          repositoryFacade.update(payload.id, { metadata });
          notifyLibraryDataChanged({ source: 'metadata-update' });
          return { success: true, data: undefined };
        } catch (error) {
          logger.error('UPDATE_HIGHLIGHT_METADATA failed', error as Error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      // Get exportable highlights for copy/export (scoped)
      messageBus.subscribe(GET_EXPORTABLE_HIGHLIGHTS, async (payload: { scope: ExportScope }) => {
        logger.info('Handling GET_EXPORTABLE_HIGHLIGHTS request', { scope: payload.scope });
        try {
          const raw = await getHighlightQueryService().findAllForExport(payload.scope);
          const highlights = raw
            .map((hl) => toExportableHighlight(hl))
            .filter((item): item is NonNullable<typeof item> => item !== null);
          return { success: true, data: { highlights } };
        } catch (error) {
          logger.error('GET_EXPORTABLE_HIGHLIGHTS failed', error as Error);
          throw error;
        }
      });

      const highlightDeleteService = container.resolve<HighlightDeleteService>('highlightDeleteService');

      const deleteContext = () => ({
        isAuthenticated: authManager.isAuthenticated,
      });

      messageBus.subscribe(IPC_HIGHLIGHT_DELETE_SCOPE, async (payload: DeleteRequest) => {
        logger.info('Handling IPC_HIGHLIGHT_DELETE_SCOPE', { scope: payload.scope });
        const result = await highlightDeleteService.executeDelete(payload, deleteContext());
        if (result.success) {
          notifyLibraryDataChanged({
            source: 'delete',
            deletedCount: result.deletedCount,
            removedIds: result.removedIds,
          });
        }
        return { success: result.success, data: result, error: result.success ? undefined : result.error, code: result.success ? undefined : result.code };
      });

      messageBus.subscribe(IPC_HIGHLIGHT_UNDO_DELETE, async () => {
        logger.info('Handling IPC_HIGHLIGHT_UNDO_DELETE');
        const result = await highlightDeleteService.undoPendingHighlight(deleteContext());
        if (result.success) {
          notifyLibraryDataChanged({ source: 'undo_delete', restoredIds: result.restoredIds });
        }
        return { success: result.success, data: result, error: result.success ? undefined : result.error, code: result.success ? undefined : result.code };
      });

      // Get Dashboard Data Handler
      messageBus.subscribe('GET_DASHBOARD_DATA', async (payload: { mode?: string }) => {
        logger.info('Handling GET_DASHBOARD_DATA request', { mode: payload?.mode });
        try {
          const data = await getHighlightQueryService().getDashboardData(payload?.mode);
          const recentHighlights = await backgroundHighlightOrchestrator.enrichWithPlaintext(
            data.recentHighlights
          );
          return {
            success: true,
            data: { ...data, recentHighlights },
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

    // One-time legacy TTL key cleanup on startup; no recurring expiry for guest storage.
    browser.runtime.onStartup.addListener(async () => {
      logger.info('Browser startup detected, running legacy TTL cleanup');
      await cleanupExpiredDomains();
    });

    void cleanupExpiredDomains();
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
