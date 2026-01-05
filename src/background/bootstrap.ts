
import { Container } from '@/background/di/container';
import { registerBackgroundServices } from '@/background/di/background-service-registration';
import { registerAuthComponents } from '@/background/auth/auth-container-registration';
import { registerAPIComponents } from '@/background/api/api-container-registration';
import { registerEventComponents } from '@/background/events/events-container-registration';
import { registerSyncComponents } from '@/background/sync/sync-container-registration';
import { registerRealtimeComponents } from '@/background/realtime/realtime-container-registration';
import { registerMigrationComponents } from '@/background/migration/migration-container-registration';
import { SupabaseConfig } from '@/background/api/supabase-client';
import { LoggerFactory } from '@/background/utils/logger';
import { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { ConnectionManager } from '@/background/realtime/connection-manager';

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
        url: (import.meta as any).env.VITE_SUPABASE_URL || '',
        anonKey: (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '',
    };

    // Validate configuration
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
        logger.warn('[BOOTSTRAP] Supabase configuration incomplete', {
            hasUrl: !!supabaseConfig.url,
            hasAnonKey: !!supabaseConfig.anonKey,
            env: (import.meta as any).env
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
    registerAuthComponents(container);   // Auth & Security (KeyManager, E2EEncryptionService)
    registerAPIComponents(container);    // API Layer
    registerEventComponents(container);  // Event Sourcing
    registerSyncComponents(container);   // Sync Engine
    registerRealtimeComponents(container); // Realtime Sync
    registerMigrationComponents(container); // Migration Service

    // 3. Initialize & Wire Signals
    const authManager = container.resolve<IAuthManager>('authManager');
    const connectionManager = container.resolve<ConnectionManager>('connectionManager');
    // const eventBus = container.resolve<IEventBus>('eventBus'); // Already used by managers

    // Auto-connect if already logged in
    const currentUser = authManager.currentUser;
    if (currentUser) {
        logger.info('User authenticated on startup, connecting realtime', { userId: currentUser.id });
        // Don't await connection here to avoid blocking background script initialization
        // which would delay MessageBus listener registration
        void connectionManager.connect(currentUser.id).catch(err => {
            logger.error('Failed to connect realtime on startup', err);
        });
    }

    // Wire auth state changes to connection manager
    authManager.onAuthStateChanged(async (state) => {
        if (state.isAuthenticated && state.user) {
            logger.info('User logged in, connecting realtime', { userId: state.user.id });
            await connectionManager.connect(state.user.id);
        } else {
            logger.info('User logged out, disconnecting realtime');
            connectionManager.disconnect();
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
