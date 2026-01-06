/**
 * @file vault-mode-service-factory.ts
 * @description Factory for creating VaultModeService with cloud sync enabled
 * 
 * This factory creates VaultModeService instances with DualWriteRepository,
 * enabling automatic sync to Supabase when authenticated.
 * 
 * Used by content scripts which run in a separate context from the background
 * service worker and cannot directly access the DI container.
 */

import { VaultModeService } from './vault-mode-service';
import { MultiSelectorEngine } from './multi-selector-engine';
import { InMemoryHighlightRepository } from '@/background/repositories/in-memory-highlight-repository';
import { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import { DualWriteRepository } from '@/background/repositories/dual-write-repository';
import { SupabaseClient, type SupabaseConfig } from '@/background/api/supabase-client';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from '@/background/auth/supabase-storage-adapter';
import { LoggerFactory } from '@/background/utils/logger';
import type { IAuthManager, User } from '@/background/auth/interfaces/i-auth-manager';

/**
 * Singleton instances
 */
let serviceInstance: VaultModeService | null = null;
let authManagerInstance: IAuthManager | null = null;

/**
 * Simple auth manager for content script context
 * Checks Supabase session state via v2 SDK
 * Maintains internal state since v2 accessors are async
 */
class ContentScriptAuthManager implements IAuthManager {
    private supabaseSDK: any;
    private _currentUser: User | null = null;

    constructor(supabaseSDK: any) {
        this.supabaseSDK = supabaseSDK;
        void this.initAuthState();
    }

    private async initAuthState() {
        try {
            // 1. Get initial session
            const { data } = await this.supabaseSDK.auth.getSession();
            this.updateUser(data.session);

            // 2. Subscribe to changes
            this.supabaseSDK.auth.onAuthStateChange((_event: string, session: any) => {
                this.updateUser(session);
            });
        } catch (error) {
            console.warn('[VaultFactory] Failed to initialize auth state', error);
        }
    }

    private updateUser(session: any) {
        if (session?.user) {
            this._currentUser = {
                id: session.user.id,
                email: session.user.email || '',
                displayName: session.user.user_metadata?.displayName || session.user.email || 'User',
            };
        } else {
            this._currentUser = null;
        }
    }

    get currentUser() {
        return this._currentUser;
    }

    get isAuthenticated(): boolean {
        return this.currentUser !== null;
    }

    // IAuthManager Implementation
    async initialize(): Promise<void> { }
    async signIn(): Promise<any> { throw new Error('Not implemented in content script context'); }
    async signOut(): Promise<void> { throw new Error('Not implemented in content script context'); }
    async refreshToken(): Promise<void> { }
    getAuthState(): any { return { isAuthenticated: this.isAuthenticated, user: this.currentUser }; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAuthStateChanged(_callback: (state: any) => void): () => void { return () => { }; }
}

/**
 * Create VaultModeService with cloud sync enabled
 * 
 * This creates a service that writes to both:
 * - Local: InMemoryHighlightRepository (fast)
 * - Cloud: SupabaseHighlightRepository (async, auth-aware)
 * 
 * @returns VaultModeService instance with DualWriteRepository
 */
export function createVaultModeServiceWithCloudSync(): VaultModeService {
    if (serviceInstance) {
        return serviceInstance;
    }

    const logger = LoggerFactory.getLogger('VaultModeService');

    // 1. Get Supabase configuration
    const supabaseConfig: SupabaseConfig = {
        url: (import.meta as any).env.VITE_SUPABASE_URL || '',
        anonKey: (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '',
    };

    // Check if Supabase is configured
    const hasSupabaseConfig = !!(supabaseConfig.url && supabaseConfig.anonKey);

    if (!hasSupabaseConfig) {
        logger.warn('[VaultFactory] Supabase not configured, using local-only storage');
        logger.warn('[VaultFactory] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync');
    }

    // 2. Create repositories
    const localRepo = new InMemoryHighlightRepository();

    let repository;

    if (hasSupabaseConfig) {
        // Create Supabase SDK client
        const supabaseSDK = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
            auth: {
                storage: new SupabaseStorageAdapter(),
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });

        // Create simple auth manager
        if (!authManagerInstance) {
            authManagerInstance = new ContentScriptAuthManager(supabaseSDK);
        }

        // Create Supabase repository
        const supabaseClient = new SupabaseClient(
            authManagerInstance,
            logger,
            supabaseConfig,
            supabaseSDK
        );
        const cloudRepo = new SupabaseHighlightRepository(supabaseClient, logger);

        // Create dual-write repository
        repository = new DualWriteRepository(
            localRepo,
            cloudRepo,
            authManagerInstance!, // Non-null assertion: we just created it above
            logger
        );

        logger.info('[VaultFactory] ✅ Cloud sync enabled with DualWriteRepository');
    } else {
        // Fallback to local-only
        repository = localRepo;
        logger.info('[VaultFactory] ⚠️ Using local-only storage (Supabase not configured)');
    }

    // 3. Create supporting services
    const selectorEngine = new MultiSelectorEngine();

    // 4. Create VaultModeService
    serviceInstance = new VaultModeService(repository, selectorEngine, logger);

    return serviceInstance;
}

/**
 * Get existing service instance or create new one with cloud sync
 * 
 * @deprecated Use createVaultModeServiceWithCloudSync() for clarity
 */
export function getVaultModeServiceWithCloudSync(): VaultModeService {
    return createVaultModeServiceWithCloudSync();
}
