/**
 * @file background.ts
 * @description Background service worker entry point
 */

import '@/background/polyfill';
import type { SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import { browser } from 'wxt/browser';

import type {
  IAuthManager,
  OAuthProviderType,
  AuthState,
} from '@/background/auth/interfaces/i-auth-manager';
import { initializeBackground } from '@/background/bootstrap';
import type { Container } from '@/background/di/container';
import type { BackgroundHighlightOrchestrator } from '@/background/services/background-highlight-orchestrator';
import { registerBillingHandlers } from '@/background/services/billing-handlers';
import { clearHighlightData } from '@/background/services/clear-highlight-data';
import type { HighlightDeleteService } from '@/background/services/highlight-delete-service';
import { type DeleteRequest } from '@/background/services/highlight-delete-service';
import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import { notifyLibrarySyncProgress } from '@/background/services/library-sync-progress';
import type { AiOrchestrator } from '@/background/services/llm/ai-orchestrator';
import type { LlmKeyStoreHolder } from '@/background/services/llm/llm-key-store-holder';
import { resolveConfiguredProvider } from '@/background/services/llm/llm-provider-factory';
import type { LLMRegistry } from '@/background/services/llm/llm-registry';
import { McpBridgeClientService } from '@/background/services/mcp-bridge-client-service';
import { McpBridgeHandler } from '@/background/services/mcp-bridge-handler';
import { registerOAuthGrantHandlers } from '@/background/services/oauth-grant-handlers';
import { resolveBackgroundPaidActive } from '@/background/services/resolve-paid-active';
import { createScopedHighlightQueryService } from '@/background/services/scoped-highlight-query';
import { authStateResponseData } from '@/shared/auth/auth-state-payload';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import {
  broadcastAuthSessionCleared,
  broadcastAuthStateChange,
} from '@/shared/auth/broadcast-auth-state';
import {
  CLEAR_VERIFICATION_STATE,
  EXTENSION_PING,
  SYNC_AUTH_SESSION,
  VERIFY_EMAIL_OTP,
  RESEND_EMAIL_OTP,
  REQUEST_PASSWORD_RESET,
  VERIFY_RECOVERY_OTP,
  UPDATE_PASSWORD,
} from '@/shared/auth/constants';
import type { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import {
  SyncAuthSessionPayloadSchema,
  EmailOnlyPayloadSchema,
  VerifyOtpPayloadSchema,
  UpdatePasswordPayloadSchema,
} from '@/shared/schemas/auth-schemas';
import { isAllowedExternalAuthOrigin } from '@/shared/auth/external-origin';
import { toExportableHighlight, type ExportScope } from '@/shared/highlight-export';
import { LoggerFactory } from '@/shared/utils/logger';
import {
  SYNC_LIBRARY,
  GET_EXPORTABLE_HIGHLIGHTS,
  UPDATE_HIGHLIGHT_METADATA,
  UPDATE_HIGHLIGHT_TEXT,
  GET_USER_TAGS,
  IPC_HIGHLIGHT_DELETE_SCOPE,
  IPC_HIGHLIGHT_UNDO_DELETE,
  CLEAR_HIGHLIGHT_DATA,
  SEARCH_HIGHLIGHTS,
} from '@/shared/schemas/message-schemas';
import type { SearchField } from '@/shared/utils/highlight-search';
import { mergeHighlightMetadataPatch } from '@/shared/utils/highlight-metadata';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import { validateHighlightText } from '@/shared/utils/highlight-text';
import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import { MODE_STORAGE_KEY } from '@/shared/constants/mode-storage';
import { getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';
import { canUseFeature } from '@/shared/utils/mode-capabilities';
import { normalizeMode } from '@/shared/utils/normalize-mode';
import type { TagService } from '@/background/services/tag-service';

const logger = LoggerFactory.getLogger('Background');

function registerExternalPingListener(): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessageExternal) {
    return;
  }
  chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    const type =
      message && typeof message === 'object' && 'type' in message
        ? String((message as { type: unknown }).type)
        : '';

    // Presence probe only returns version. Allow when origin is known-good OR
    // when Chrome omits sender.url (seen on some external-message paths).
    // Do not use this relaxed check for auth/session messages.
    if (type === EXTENSION_PING) {
      const originOk = !sender.url || isAllowedExternalAuthOrigin(sender.url);
      if (!originOk) {
        sendResponse({
          success: false,
          error: `Forbidden origin: ${sender.url}`,
          code: 'FORBIDDEN_ORIGIN',
        });
        return false;
      }
      let version = '0';
      try {
        version = chrome.runtime.getManifest().version;
      } catch {
        /* ignore */
      }
      sendResponse({ success: true, data: { ok: true, version } });
      return false;
    }

    if (!isAllowedExternalAuthOrigin(sender.url)) {
      sendResponse({
        success: false,
        error: 'Forbidden origin',
        code: 'FORBIDDEN_ORIGIN',
      });
      return false;
    }
    sendResponse({
      success: false,
      error: 'Unsupported external message',
      code: 'UNSUPPORTED',
    });
    return false;
  });
  logger.info('onMessageExternal listener registered (EXTENSION_PING)');
}

export default defineBackground({
  type: 'module',
  async main() {
    logger.info('Background service worker started');

    // Register before heavy init so web install gate works even if DI is slow.
    registerExternalPingListener();

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
      const backgroundHighlightOrchestrator =
        container.resolve<BackgroundHighlightOrchestrator>(
          'backgroundHighlightOrchestrator'
        );
      backgroundHighlightOrchestrator.initialize();
      logger.info('[INIT] BackgroundHighlightOrchestrator initialized');

      const aiOrchestrator = container.resolve<AiOrchestrator>('aiOrchestrator');
      const scopedHighlightRepositoryForAi = container.resolve<ScopedHighlightRepository>(
        'scopedHighlightRepository'
      );
      const getIsPaidActive = async (): Promise<boolean> =>
        resolveBackgroundPaidActive({
          isAuthenticated: authManager.isAuthenticated,
          getSupabase: () => {
            try {
              return container.resolve<SupabaseSDKClient>('_supabaseSDK');
            } catch {
              return null;
            }
          },
        });

      aiOrchestrator.configureFeatureGate(async () => {
        const stored = await browser.storage.local.get(MODE_STORAGE_KEY);
        const mode = normalizeMode(stored[MODE_STORAGE_KEY]);
        return {
          mode,
          capabilities: getCapabilitiesForMode(mode),
          isAuthenticated: authManager.isAuthenticated,
          storageScope: scopedHighlightRepositoryForAi.getActiveScope(),
          isPaidActive: await getIsPaidActive(),
        };
      });
      aiOrchestrator.configurePrefsSync({
        getSupabase: () => {
          try {
            return container.resolve<SupabaseSDKClient>('_supabaseSDK');
          } catch {
            return null;
          }
        },
        getUserId: async () => authManager.getAuthState().user?.id ?? null,
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
            logger.error(
              'Login failed explicitly',
              new Error(result.error?.message || 'Login failed')
            );
            return {
              success: false,
              error: result.error?.message || 'Login failed. Please try again.',
              code: result.error?.code,
              retryAfterMs: result.error?.retryAfterMs,
            };
          }
          return {
            success: true,
            data: authStateResponseData(authManager.getAuthState()),
          };
        } catch (error) {
          logger.error('Login handler caught error', error as Error);
          // OAuth flow (unlike the direct AuthResult paths) still throws on
          // failure; the message is already user-facing (mapAuthError in
          // AuthManager), so surface it as-is rather than a raw Error.
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Login failed. Please try again.',
          };
        }
      });

      // Login Email Handler
      messageBus.subscribe(
        'LOGIN_EMAIL',
        async (payload: { email?: string; password?: string }) => {
          logger.info('Handling LOGIN_EMAIL request', { email: payload.email });
          if (!payload.email || !payload.password) {
            return {
              success: false,
              error: 'Email and password are required',
              code: 'INVALID_PAYLOAD',
            };
          }

          const result = await authManager.signInWithEmail(
            payload.email,
            payload.password
          );
          logger.info('AuthManager returned email login result', {
            success: result.success,
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error?.message || 'Email login failed. Please try again.',
              code: result.error?.code,
              retryAfterMs: result.error?.retryAfterMs,
            };
          }
          return {
            success: true,
            data: authStateResponseData(authManager.getAuthState()),
          };
        }
      );

      // Register Email Handler
      messageBus.subscribe(
        'REGISTER_EMAIL',
        async (payload: { email?: string; password?: string }) => {
          logger.info('Handling REGISTER_EMAIL request', { email: payload.email });
          if (!payload.email || !payload.password) {
            return {
              success: false,
              error: 'Email and password are required',
              code: 'INVALID_PAYLOAD',
            };
          }

          const result = await authManager.signUpWithEmail(
            payload.email,
            payload.password
          );
          logger.info('AuthManager returned email register result', {
            success: result.success,
          });

          if (!result.success) {
            return {
              success: false,
              error:
                result.error?.message || 'Email registration failed. Please try again.',
              code: result.error?.code,
              retryAfterMs: result.error?.retryAfterMs,
            };
          }
          return {
            success: true,
            data: authStateResponseData(authManager.getAuthState()),
          };
        }
      );
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
          return {
            success: false,
            error: 'Invalid session payload',
            code: 'INVALID_PAYLOAD',
          };
        }

        if (parsed.data === null) {
          await authManager.signOut();
          broadcastAuthSessionCleared();
          return { success: true, data: {} };
        }

        const result = await authManager.setSession(
          parsed.data.access_token,
          parsed.data.refresh_token
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

      // Verify email OTP Handler (signup confirmation)
      messageBus.subscribe(VERIFY_EMAIL_OTP, async (payload: unknown) => {
        logger.info('Handling VERIFY_EMAIL_OTP request');
        const parsed = VerifyOtpPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            success: false,
            error: 'Enter a valid email and 6-digit code',
            code: 'INVALID_PAYLOAD',
          };
        }

        const result = await authManager.verifyEmailOtp(
          parsed.data.email,
          parsed.data.token
        );
        if (!result.success) {
          return {
            success: false,
            error: result.error?.message ?? 'Verification failed',
            code: result.error?.code,
            retryAfterMs: result.error?.retryAfterMs,
          };
        }
        return { success: true, data: authStateResponseData(authManager.getAuthState()) };
      });

      // Resend email OTP Handler
      messageBus.subscribe(RESEND_EMAIL_OTP, async (payload: unknown) => {
        logger.info('Handling RESEND_EMAIL_OTP request');
        const parsed = EmailOnlyPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            success: false,
            error: 'A valid email is required',
            code: 'INVALID_PAYLOAD',
          };
        }

        const result = await authManager.resendEmailOtp(parsed.data.email);
        if (!result.success) {
          return {
            success: false,
            error: result.error?.message ?? 'Failed to resend code',
            code: result.error?.code,
            retryAfterMs: result.error?.retryAfterMs,
          };
        }
        return { success: true, data: authStateResponseData(authManager.getAuthState()) };
      });

      // Request password reset Handler
      messageBus.subscribe(REQUEST_PASSWORD_RESET, async (payload: unknown) => {
        logger.info('Handling REQUEST_PASSWORD_RESET request');
        const parsed = EmailOnlyPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            success: false,
            error: 'A valid email is required',
            code: 'INVALID_PAYLOAD',
          };
        }

        const result = await authManager.requestPasswordReset(parsed.data.email);
        if (!result.success) {
          return {
            success: false,
            error: result.error?.message ?? 'Failed to request password reset',
            code: result.error?.code,
            retryAfterMs: result.error?.retryAfterMs,
          };
        }
        return { success: true, data: {} };
      });

      // Verify recovery OTP Handler (password reset)
      messageBus.subscribe(VERIFY_RECOVERY_OTP, async (payload: unknown) => {
        logger.info('Handling VERIFY_RECOVERY_OTP request');
        const parsed = VerifyOtpPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            success: false,
            error: 'Enter a valid email and 6-digit code',
            code: 'INVALID_PAYLOAD',
          };
        }

        const result = await authManager.verifyRecoveryOtp(
          parsed.data.email,
          parsed.data.token
        );
        if (!result.success) {
          return {
            success: false,
            error: result.error?.message ?? 'Verification failed',
            code: result.error?.code,
            retryAfterMs: result.error?.retryAfterMs,
          };
        }
        return { success: true, data: authStateResponseData(authManager.getAuthState()) };
      });

      // Update password Handler
      messageBus.subscribe(UPDATE_PASSWORD, async (payload: unknown) => {
        logger.info('Handling UPDATE_PASSWORD request');
        const parsed = UpdatePasswordPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            success: false,
            error: 'Password does not meet requirements',
            code: 'INVALID_PAYLOAD',
          };
        }

        const result = await authManager.updatePassword(parsed.data.password);
        if (!result.success) {
          return {
            success: false,
            error: result.error?.message ?? 'Failed to update password',
            code: result.error?.code,
          };
        }
        return { success: true, data: authStateResponseData(authManager.getAuthState()) };
      });

      // Forward Auth State Changes to popup, content scripts, and web tabs
      // (MCP revalidation hooked after mcpBridgeClient is created below)

      // --- Collections API handlers ---

      const scopedHighlightRepository = container.resolve<ScopedHighlightRepository>(
        'scopedHighlightRepository'
      );
      const tagService = container.resolve<TagService>('tagService');

      const getHighlightQueryService = () =>
        createScopedHighlightQueryService({
          isAuthenticated: authManager.isAuthenticated,
          repositoryFacade,
          scopedHighlightRepository,
          tagResolver: tagService,
        });

      const cloudHydrationService = container.resolve<ICloudHydrationService>(
        'cloudHydrationService'
      );

      const librarySyncCursor = container.resolve<LibrarySyncCursor>('librarySyncCursor');
      const llmRegistry = container.resolve<LLMRegistry>('llmRegistry');
      const llmKeyStoreHolder = container.resolve<LlmKeyStoreHolder>('llmKeyStoreHolder');

      const mcpBridgeHandler = new McpBridgeHandler({
        authManager,
        getHighlightQueryService,
        backgroundHighlightOrchestrator,
        scopedHighlightRepository,
        repositoryFacade,
        tagService,
        cloudHydrationService,
        librarySyncCursor,
        llmChat: async (payload: { provider?: ProviderName; request: LLMRequest }) => {
          const instance = await resolveConfiguredProvider(
            llmRegistry,
            llmKeyStoreHolder.get(),
            payload.provider
          );
          const result = await instance.chat(payload.request);
          return { text: result.text };
        },
        getIsPaidActive,
      });
      const mcpBridgeClient = new McpBridgeClientService(mcpBridgeHandler, logger);
      mcpBridgeClient.start();
      logger.info('[INIT] McpBridgeClientService started');

      authManager.onAuthStateChanged((state: AuthState) => {
        broadcastAuthStateChange(state);
        mcpBridgeClient.revalidateEligibility();
      });

      // Manual library sync (Settings → Sync library)
      messageBus.subscribe(SYNC_LIBRARY, async () => {
        logger.info('Handling SYNC_LIBRARY request');
        try {
          if (!authManager.isAuthenticated) {
            return { success: false, error: 'Sign in to sync library with cloud' };
          }
          const result = await cloudHydrationService.hydrate((percent, phase) => {
            notifyLibrarySyncProgress(percent, phase);
          });
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
          const collections = await getHighlightQueryService().getCollections(
            payload?.mode
          );
          return { success: true, data: { collections } };
        } catch (error) {
          logger.error('GET_COLLECTIONS failed', error as Error);
          throw error;
        }
      });

      // Get Highlights By Domain Handler
      messageBus.subscribe(
        'GET_HIGHLIGHTS_BY_DOMAIN',
        async (payload: { domain: string }) => {
          logger.info('Handling GET_HIGHLIGHTS_BY_DOMAIN request', {
            domain: payload.domain,
          });
          try {
            const highlights = await getHighlightQueryService().getHighlightsByDomain(
              payload.domain
            );
            const withPlaintext =
              await backgroundHighlightOrchestrator.enrichWithPlaintext(highlights);
            return { success: true, data: { highlights: withPlaintext } };
          } catch (error) {
            logger.error('GET_HIGHLIGHTS_BY_DOMAIN failed', error as Error);
            throw error;
          }
        }
      );

      // Search Highlights Handler (library-wide, or scoped to domain/section)
      messageBus.subscribe(
        SEARCH_HIGHLIGHTS,
        async (payload: {
          query: string;
          domain?: string;
          section?: string;
          fields?: SearchField[];
        }) => {
          logger.info('Handling SEARCH_HIGHLIGHTS request', {
            domain: payload.domain,
            section: payload.section,
          });
          try {
            const highlights = await getHighlightQueryService().search(payload.query, {
              domain: payload.domain,
              section: payload.section,
              fields: payload.fields,
            });
            const withPlaintext =
              await backgroundHighlightOrchestrator.enrichWithPlaintext(highlights);
            return { success: true, data: { highlights: withPlaintext } };
          } catch (error) {
            logger.error('SEARCH_HIGHLIGHTS failed', error as Error);
            throw error;
          }
        }
      );

      messageBus.subscribe(CLEAR_HIGHLIGHT_DATA, async () => {
        logger.info('Handling CLEAR_HIGHLIGHT_DATA request');
        try {
          const result = await clearHighlightData(
            repositoryFacade,
            scopedHighlightRepository,
            logger
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

      const getFeatureGateContext = async () => {
        const stored = await browser.storage.local.get(MODE_STORAGE_KEY);
        const mode = normalizeMode(stored[MODE_STORAGE_KEY]);
        return {
          mode,
          capabilities: getCapabilitiesForMode(mode),
          isAuthenticated: authManager.isAuthenticated,
          storageScope: scopedHighlightRepository.getActiveScope(),
          isPaidActive: await getIsPaidActive(),
        };
      };

      messageBus.subscribe(
        UPDATE_HIGHLIGHT_METADATA,
        async (payload: {
          id: string;
          notes?: string;
          tags?: string[];
          presentation?: HighlightPresentation | null;
        }) => {
          logger.info('Handling UPDATE_HIGHLIGHT_METADATA request', { id: payload.id });
          try {
            if (
              payload.notes === undefined &&
              payload.tags === undefined &&
              payload.presentation === undefined
            ) {
              return {
                success: false,
                error: 'No notes, tags, or presentation to update',
              };
            }

            if (payload.tags !== undefined) {
              const tagsGate = canUseFeature('tags', await getFeatureGateContext());
              if (!tagsGate.allowed) {
                return {
                  success: false,
                  error: tagsGate.reason ?? 'Tags not available in this mode',
                  code: tagsGate.reason,
                };
              }
            }

            const existing = repositoryFacade.get(payload.id);
            if (!existing) {
              return { success: false, error: `Highlight not found: ${payload.id}` };
            }

            // Dual-write: keep metadata.tags in sync with the junction table so
            // list/read paths that only look at metadata still show tags after reload.
            // presentation updates never rewrite quote `text`.
            const metadata = mergeHighlightMetadataPatch(existing.metadata, {
              notes: payload.notes,
              tags: payload.tags,
              presentation: payload.presentation,
            });
            repositoryFacade.update(payload.id, { metadata });

            if (payload.tags !== undefined) {
              await tagService.setHighlightLabels(payload.id, payload.tags);
            }

            notifyLibraryDataChanged({ source: 'metadata-update' });
            return { success: true, data: undefined };
          } catch (error) {
            logger.error('UPDATE_HIGHLIGHT_METADATA failed', error as Error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
      );

      messageBus.subscribe(
        UPDATE_HIGHLIGHT_TEXT,
        async (payload: { id: string; text: string }) => {
          logger.info('Handling UPDATE_HIGHLIGHT_TEXT request', { id: payload.id });
          try {
            const collectionsGate = canUseFeature(
              'collections',
              await getFeatureGateContext()
            );
            if (!collectionsGate.allowed) {
              return {
                success: false,
                error: collectionsGate.reason ?? 'Collections not available in this mode',
                code: collectionsGate.reason,
              };
            }

            const validated = validateHighlightText(payload.text);
            if (!validated.ok) {
              return { success: false, error: validated.error };
            }

            const existing = repositoryFacade.get(payload.id);
            if (!existing) {
              return { success: false, error: 'Highlight not found' };
            }

            // Update body text only — never rewrite ranges / TextQuote selectors.
            repositoryFacade.update(payload.id, { text: validated.text });
            notifyLibraryDataChanged({ source: 'text-update' });
            return { success: true, data: undefined };
          } catch (error) {
            logger.error('UPDATE_HIGHLIGHT_TEXT failed', error as Error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
      );

      messageBus.subscribe(GET_USER_TAGS, async () => {
        logger.info('Handling GET_USER_TAGS request');
        try {
          const tags = await tagService.listByUser();
          return {
            success: true,
            data: {
              tags: tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                createdAt: tag.createdAt.toISOString(),
              })),
            },
          };
        } catch (error) {
          logger.error('GET_USER_TAGS failed', error as Error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      // Get exportable highlights for copy/export (scoped)
      messageBus.subscribe(
        GET_EXPORTABLE_HIGHLIGHTS,
        async (payload: { scope: ExportScope }) => {
          logger.info('Handling GET_EXPORTABLE_HIGHLIGHTS request', {
            scope: payload.scope,
          });
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
        }
      );

      const highlightDeleteService = container.resolve<HighlightDeleteService>(
        'highlightDeleteService'
      );

      const deleteContext = () => ({
        isAuthenticated: authManager.isAuthenticated,
      });

      messageBus.subscribe(IPC_HIGHLIGHT_DELETE_SCOPE, async (payload: DeleteRequest) => {
        logger.info('Handling IPC_HIGHLIGHT_DELETE_SCOPE', { scope: payload.scope });
        const result = await highlightDeleteService.executeDelete(
          payload,
          deleteContext()
        );
        if (result.success) {
          notifyLibraryDataChanged({
            source: 'delete',
            deletedCount: result.deletedCount,
            removedIds: result.removedIds,
          });
        }
        return {
          success: result.success,
          data: result,
          error: result.success ? undefined : result.error,
          code: result.success ? undefined : result.code,
        };
      });

      messageBus.subscribe(IPC_HIGHLIGHT_UNDO_DELETE, async () => {
        logger.info('Handling IPC_HIGHLIGHT_UNDO_DELETE');
        const result = await highlightDeleteService.undoPendingHighlight(deleteContext());
        if (result.success) {
          notifyLibraryDataChanged({
            source: 'undo_delete',
            restoredIds: result.restoredIds,
          });
        }
        return {
          success: result.success,
          data: result,
          error: result.success ? undefined : result.error,
          code: result.success ? undefined : result.code,
        };
      });

      // Get Dashboard Data Handler
      messageBus.subscribe('GET_DASHBOARD_DATA', async (payload: { mode?: string }) => {
        logger.info('Handling GET_DASHBOARD_DATA request', { mode: payload?.mode });
        try {
          const data = await getHighlightQueryService().getDashboardData(payload?.mode);
          const recentHighlights =
            await backgroundHighlightOrchestrator.enrichWithPlaintext(
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

      registerBillingHandlers({
        messageBus,
        authManager,
        getSupabase: () => container.resolve<SupabaseSDKClient>('_supabaseSDK'),
        logger,
      });
      registerOAuthGrantHandlers({
        messageBus,
        authManager,
        getSupabase: () => container.resolve<SupabaseSDKClient>('_supabaseSDK'),
        logger,
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
          senderId: sender.id,
        });

        // Reply with error to any message
        const response = {
          success: false,
          error: `Background initialization failed: ${(error as Error).message}. Check console logs.`,
          code: 'INIT_FAILED',
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
  },
});
