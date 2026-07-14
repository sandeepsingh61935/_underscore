
import { Container } from '@/background/di/container';
import { registerBackgroundServices } from '@/background/di/background-service-registration';
import { registerAuthComponents } from '@/background/auth/auth-container-registration';
import { registerAPIComponents } from '@/background/api/api-container-registration';
import { registerEventComponents } from '@/background/events/events-container-registration';
import { registerSyncComponents } from '@/background/sync/sync-container-registration';
import { registerRealtimeComponents } from '@/background/realtime/realtime-container-registration';
import { registerRepositoryComponents } from '@/background/repositories/repository-container-registration';
import { SupabaseConfig } from '@/background/api/supabase-client';
import { LoggerFactory } from '@/shared/utils/logger';
import { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { ConnectionManager } from '@/background/realtime/connection-manager';
import { EventBridge } from '@/background/services/event-bridge';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import { RealtimeHighlightIngestService } from '@/background/services/realtime-highlight-ingest-service';
import { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import { handleAuthStorageEvent } from '@/background/services/auth-storage-lifecycle';
import { LlmKeyStoreHolder } from '@/background/services/llm/llm-key-store-holder';
import type { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import type { ScopedTagRepository } from '@/shared/repositories/scoped-tag-repository';
import { migrateLegacyVaultToBasic } from '@/background/repositories/migrate-legacy-highlight-db';

const logger = LoggerFactory.getLogger('Bootstrap');

/**
 * Initialize background services and dependency injection
 */
export async function initializeBackground(): Promise<Container> {
    logger.info('Initializing background services...');

    const container = new Container();

    // 1. Configuration
    // TODO: Load from env or secure storage
    const supabaseConfig: SupabaseConfig = {
        url: import.meta.env.VITE_SUPABASE_URL || '',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };

    // Validate configuration
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
        logger.warn('[BOOTSTRAP] Supabase configuration incomplete', {
            hasUrl: !!supabaseConfig.url,
            hasAnonKey: !!supabaseConfig.anonKey,
            envKeys: Object.keys(import.meta.env)
        });
        logger.warn('[BOOTSTRAP] Auth features will not work. Check .env.development file.');
    } else {
        logger.info('[BOOTSTRAP] Supabase configuration loaded', {
            url: supabaseConfig.url.substring(0, 30) + '...',
            anonKeyLength: supabaseConfig.anonKey.length
        });
    }

    container.registerInstance('supabaseConfig', supabaseConfig);

    // 2. Register Services (Background-specific - no content script modules)
    registerBackgroundServices(container);  // Base services + Auth
    registerAuthComponents(container);   // Auth & Security
    registerAPIComponents(container);    // API Layer
    registerRepositoryComponents(container); // Repository Layer (NEW)
    registerEventComponents(container);  // Event Sourcing
    registerSyncComponents(container);   // Sync Engine
    registerRealtimeComponents(container); // Realtime Sync

    // 2.5 Hydrate the repository facade from IndexedDB so the in-memory cache
    //     reflects persisted data on startup (e.g. after a service-worker restart).
    //     Without this, reads after a cold start return 0 even when data exists in IDB.
    const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
    const scopedHighlightRepository = container.resolve<ScopedHighlightRepository>('scopedHighlightRepository');
    const scopedTagRepository = container.resolve<ScopedTagRepository>('scopedTagRepository');
    const cloudHydrationService = container.resolve<ICloudHydrationService>('cloudHydrationService');
    const librarySyncCursor = container.resolve<LibrarySyncCursor>('librarySyncCursor');
    const localWriteEchoTracker = container.resolve<LocalWriteEchoTracker>('localWriteEchoTracker');
    const realtimeHighlightIngestService = container.resolve<RealtimeHighlightIngestService>('realtimeHighlightIngestService');
    const llmKeyStoreHolder = container.resolve<LlmKeyStoreHolder>('llmKeyStoreHolder');

    const configureLlmKeyTier = (isAuthenticated: boolean): void => {
        llmKeyStoreHolder.configureForAuth(isAuthenticated);
    };

    await migrateLegacyVaultToBasic(logger);
    await repositoryFacade.initialize();

    const authStorageDeps = {
        scopedRepository: scopedHighlightRepository,
        scopedTagRepository,
        repositoryFacade,
        cloudHydration: cloudHydrationService,
        syncCursor: librarySyncCursor,
        echoTracker: localWriteEchoTracker,
    };

    realtimeHighlightIngestService.initialize();

    // 3. Initialize & Wire Signals
    const authManager = container.resolve<IAuthManager>('authManager');
    const connectionManager = container.resolve<ConnectionManager>('connectionManager');

    // Initialize Event Bridge
    const eventBridge = container.resolve<EventBridge>('eventBridge');
    eventBridge.initialize();

    logger.info('[BOOTSTRAP] Starting auth initialization...');

    // CRITICAL: Wait for auth initialization before checking user state
    // Otherwise currentUser will always be null on startup
    await authManager.initialize();

    logger.info('[BOOTSTRAP] Auth initialization complete', {
        isAuthenticated: authManager.isAuthenticated,
        hasUser: !!authManager.currentUser,
        userId: authManager.currentUser?.id
    });

    // Auto-connect if already logged in
    const currentUser = authManager.currentUser;
    if (currentUser) {
        logger.info('[BOOTSTRAP] User authenticated on startup, activating Pro storage', { userId: currentUser.id });
        void connectionManager.connect(currentUser.id).catch(err => {
            logger.error('[BOOTSTRAP] Failed to connect realtime on startup', err);
        });
        void handleAuthStorageEvent({ type: 'SIGNED_IN', userId: currentUser.id }, authStorageDeps).catch(err => {
            logger.error('[BOOTSTRAP] Auth storage sign-in failed on startup', err as Error);
        });
        configureLlmKeyTier(true);
    } else {
        logger.warn('[BOOTSTRAP] No authenticated user on startup, using Basic storage');
        await scopedHighlightRepository.activateScope('basic');
        scopedTagRepository.activateScope('basic');
        configureLlmKeyTier(false);
    }

    // Wire auth state changes to connection manager
    authManager.onAuthStateChanged(async (state) => {
        if (state.isAuthenticated && state.user) {
            logger.info('User logged in, connecting realtime', { userId: state.user.id });
            void connectionManager.connect(state.user.id).catch(err => {
                logger.error('[BOOTSTRAP] Failed to connect realtime on login', err);
            });
            try {
                await handleAuthStorageEvent(
                    { type: 'SIGNED_IN', userId: state.user.id },
                    authStorageDeps,
                );
                configureLlmKeyTier(true);
            } catch (err) {
                logger.error('[BOOTSTRAP] Auth storage sign-in failed on login', err as Error);
            }
        } else {
            logger.info('User logged out, wiping Pro local storage');
            connectionManager.disconnect();
            try {
                await handleAuthStorageEvent({ type: 'SIGNED_OUT' }, authStorageDeps);
                configureLlmKeyTier(false);
            } catch (err) {
                logger.error('[BOOTSTRAP] Auth storage sign-out failed', err as Error);
            }
        }
    });

    // Wiring handled by individual components via EventBus?
    // ConnectionManager needs explicit connect/disconnect triggers if not updated via EventBus
    // We didn't implement Auth listening in ConnectionManager yet, so we wire it here or TODO it.
    // Assuming AuthManager emits standard events. 
    // If not, we should rely on AuthStateObserver.

    // For now, validation will fail if we don't handle auth state changes.
    // But since I don't know the exact EventName for auth (checking in next tool), 
    // I will look at the previous tool output or this tool's parallel exec.

    return container;
}
