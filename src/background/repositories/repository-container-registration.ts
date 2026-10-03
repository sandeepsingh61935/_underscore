/**
 * @file repository-container-registration.ts
 * @description DI container registration for repository layer
 * @architecture Dependency Injection - registers highlight repositories for storage
 */

import type { SupabaseClient } from '@/background/api/supabase-client';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { Container } from '@/background/di/container';
import { DualWriteRepository } from '@/background/repositories/dual-write-repository';
import { IndexedDBGroupRepository } from '@/background/repositories/indexed-db-group-repository';
import { IndexedDBHighlightRepository } from '@/background/repositories/indexed-db-highlight-repository';
import { IndexedDBTagRepository } from '@/background/repositories/indexed-db-tag-repository';
import { SupabaseGroupRepository } from '@/background/repositories/supabase-group-repository';
import { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import { SupabaseTagRepository } from '@/background/repositories/supabase-tag-repository';
import { BackgroundHighlightOrchestrator } from '@/background/services/background-highlight-orchestrator';
import { CloudHydrationService } from '@/background/services/cloud-hydration-service';
import { DeviceLibraryUpload } from '@/background/services/device-library-upload';
import { DeviceIdService } from '@/background/services/device-id-service';
import { HighlightCloudDeleteAdapter } from '@/background/services/highlight-cloud-delete-adapter';
import { HighlightDeleteService } from '@/background/services/highlight-delete-service';
import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import type { IDeviceLibraryUpload } from '@/background/services/interfaces/i-device-library-upload';
import { GroupSyncCursor, LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import {
  TabGroupBindingStore,
  tabGroupBindingStore,
} from '@/background/services/tab-group-binding-store';
import { TabGroupSyncService } from '@/background/services/tab-group-sync-service';
import { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import { OfflineQueueService } from '@/background/services/offline-queue-service';
import { RealtimeGroupIngestService } from '@/background/services/realtime-group-ingest-service';
import { RealtimeHighlightIngestService } from '@/background/services/realtime-highlight-ingest-service';
import {
  createScopedGroupService,
  type GroupCloudEntity,
  type GroupCloudOp,
} from '@/background/services/group-service';
import { TagService } from '@/background/services/tag-service';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import {
  BASIC_HIGHLIGHT_DB_NAME,
  PRO_HIGHLIGHT_DB_NAME,
} from '@/shared/constants/highlight-storage-scope';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import { ScopedTagRepository } from '@/shared/repositories/scoped-tag-repository';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Register repository components in DI container
 *
 * Registered services:
 * - 'localRepository' → InMemoryHighlightRepository (fast, in-memory storage)
 * - 'supabaseHighlightRepository' → SupabaseHighlightRepository (cloud storage)
 * - 'highlightRepository' → DualWriteRepository (local + cloud dual-write)
 *
 * Dependencies required:
 * - 'logger' → ILogger
 * - '_supabaseClient' → SupabaseClient (from API layer)
 * - 'authManager' → IAuthManager
 *
 * @example
 * ```typescript
 * const container = new Container();
 *
 * // Register dependencies first
 * registerBaseServices(container);
 * registerAPIComponents(container);
 * registerAuthComponents(container);
 *
 * // Register repositories
 * registerRepositoryComponents(container);
 *
 * // Resolve
 * const repo = container.resolve<IHighlightRepository>('highlightRepository');
 * ```
 */
export function registerRepositoryComponents(container: Container): void {
  // ==================== Local Repository ====================

  /**
   * Basic local highlight store — guest / logged-out persistence.
   */
  container.registerSingleton<IHighlightRepository>('basicHighlightRepository', () => {
    const logger = container.resolve<ILogger>('logger');
    return new IndexedDBHighlightRepository(logger, BASIC_HIGHLIGHT_DB_NAME);
  });

  /**
   * Pro local highlight store — account offline cache while signed in.
   */
  container.registerSingleton<IHighlightRepository>('proHighlightRepository', () => {
    const logger = container.resolve<ILogger>('logger');
    return new IndexedDBHighlightRepository(logger, PRO_HIGHLIGHT_DB_NAME);
  });

  /**
   * Auth-scoped router over Basic + Pro local stores.
   */
  container.registerSingleton<ScopedHighlightRepository>(
    'scopedHighlightRepository',
    () => {
      const basic = container.resolve<IHighlightRepository>(
        'basicHighlightRepository' as any
      );
      const pro = container.resolve<IHighlightRepository>(
        'proHighlightRepository' as any
      );
      return new ScopedHighlightRepository(basic, pro, 'basic');
    }
  );

  /**
   * @deprecated Use scopedHighlightRepository. Kept for container key compatibility.
   */
  container.registerSingleton<IHighlightRepository>('localRepository', () => {
    return container.resolve<ScopedHighlightRepository>(
      'scopedHighlightRepository' as any
    );
  });

  // ==================== Cloud Repository ====================

  /**
   * SupabaseHighlightRepository - Singleton
   * Cloud storage via Supabase PostgreSQL
   */
  container.registerSingleton<IHighlightRepository>('supabaseHighlightRepository', () => {
    const supabaseClient = container.resolve<SupabaseClient>('_supabaseClient');
    const logger = container.resolve<ILogger>('logger');

    return new SupabaseHighlightRepository(supabaseClient, logger);
  });

  // ==================== Offline Queue ====================

  /**
   * OfflineQueueService - Singleton
   * Manages retries for failed cloud operations
   */
  container.registerSingleton('offlineQueueService', () => {
    const cloudRepo = container.resolve<SupabaseHighlightRepository>(
      'supabaseHighlightRepository' as any
    );
    const authManager = container.resolve<IAuthManager>('authManager');
    const logger = container.resolve<ILogger>('logger');
    // Task 2.3 wiring: group cloud repo so queued group/group_item
    // operations replay via putGroup/putItem (Task 2.2 queue support).
    // Lazy resolve — registered below but available before first use.
    const groupCloudRepo = container.resolve<IGroupRepository>(
      'supabaseGroupRepository' as never
    );

    return new OfflineQueueService(cloudRepo, authManager, logger, groupCloudRepo);
  });

  container.registerSingleton('localWriteEchoTracker', () => new LocalWriteEchoTracker());

  container.registerSingleton('librarySyncCursor', () => new LibrarySyncCursor());

  container.registerSingleton('groupSyncCursor', () => new GroupSyncCursor());

  // ==================== Dual-Write Repository (Primary) ====================

  /**
   * DualWriteRepository - Singleton
   * Writes to local (fast) + cloud (async) for best of both worlds
   *
   * Strategy:
   * - Write to local immediately (synchronous, reliable)
   * - Write to cloud async (fire-and-forget, auth-aware)
   * - Read from local (fastest, most up-to-date)
   *
   * This is the primary repository used by CloudModeService
   */
  container.registerSingleton<IHighlightRepository>('highlightRepository', () => {
    const localRepo = container.resolve<IHighlightRepository>('localRepository' as any);
    const cloudRepo = container.resolve<SupabaseHighlightRepository>(
      'supabaseHighlightRepository' as any
    );
    const authManager = container.resolve<IAuthManager>('authManager');
    const offlineQueue = container.resolve<any>('offlineQueueService');
    const echoTracker = container.resolve<LocalWriteEchoTracker>(
      'localWriteEchoTracker' as any
    );
    const logger = container.resolve<ILogger>('logger');

    return new DualWriteRepository(
      localRepo,
      cloudRepo,
      authManager,
      offlineQueue,
      echoTracker,
      logger
    );
  });

  // ============================================
  // OVERRIDE BASE REPOSITORY FACADE (Background Only)
  // ============================================
  container.registerSingleton<RepositoryFacade>('repositoryFacade', () => {
    const repository = container.resolve<IHighlightRepository>('highlightRepository');
    return new RepositoryFacade(repository);
  });

  // ==================== Cloud Hydration ====================

  container.registerSingleton<ICloudHydrationService>('cloudHydrationService', () => {
    const authManager = container.resolve<IAuthManager>('authManager');
    const highlightRepository =
      container.resolve<IHighlightRepository>('highlightRepository');
    const cloudRepository = container.resolve<SupabaseHighlightRepository>(
      'supabaseHighlightRepository' as any
    );
    const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
    const syncCursor = container.resolve<LibrarySyncCursor>('librarySyncCursor' as any);
    const logger = container.resolve<ILogger>('logger');

    const proTags = container.resolve<ITagRepository>('proTagRepository' as never);
    const cloudTags = container.resolve<SupabaseTagRepository>(
      'supabaseTagRepository' as never
    );

    // Task 2.3: Page Groups incremental hydration rides on every hydrate()
    // (sign-in, realtime connect, SYNC_LIBRARY).
    const proGroups = container.resolve<IGroupRepository>(
      'proGroupRepository' as never
    );
    const cloudGroups = container.resolve<SupabaseGroupRepository>(
      'supabaseGroupRepository' as never
    );
    const groupCursor = container.resolve<GroupSyncCursor>('groupSyncCursor' as never);

    return new CloudHydrationService(
      authManager,
      highlightRepository,
      cloudRepository,
      repositoryFacade,
      syncCursor,
      logger,
      proTags,
      cloudTags,
      {
        proGroupRepository: proGroups,
        cloudGroupRepository: cloudGroups,
        groupSyncCursor: groupCursor,
      }
    );
  });

  container.registerSingleton('realtimeHighlightIngestService', () => {
    const eventBus = container.resolve<IEventBus>('eventBus');
    const highlightRepository =
      container.resolve<IHighlightRepository>('highlightRepository');
    const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
    const echoTracker = container.resolve<LocalWriteEchoTracker>(
      'localWriteEchoTracker' as any
    );
    const logger = container.resolve<ILogger>('logger');

    return new RealtimeHighlightIngestService(
      eventBus,
      highlightRepository,
      repositoryFacade,
      echoTracker,
      logger
    );
  });

  container.registerSingleton('realtimeGroupIngestService', () => {
    const eventBus = container.resolve<IEventBus>('eventBus');
    const proGroups = container.resolve<IGroupRepository>(
      'proGroupRepository' as never
    );
    const echoTracker = container.resolve<LocalWriteEchoTracker>(
      'localWriteEchoTracker' as any
    );
    const logger = container.resolve<ILogger>('logger');

    return new RealtimeGroupIngestService(eventBus, proGroups, echoTracker, logger);
  });

  container.registerSingleton<BackgroundHighlightOrchestrator>(
    'backgroundHighlightOrchestrator',
    () => {
      const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
      const messageBus = container.resolve<IMessageBus>('messageBus');
      const logger = container.resolve<ILogger>('logger');
      return new BackgroundHighlightOrchestrator(repositoryFacade, messageBus, logger);
    }
  );

  container.registerSingleton<HighlightDeleteService>('highlightDeleteService', () => {
    const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
    const supabaseClient = container.resolve<SupabaseClient>('_supabaseClient');
    const cloud = new HighlightCloudDeleteAdapter(supabaseClient);
    return new HighlightDeleteService(repositoryFacade, cloud);
  });

  // ==================== Tag Repositories ====================

  container.registerSingleton('basicTagRepository', () => {
    const logger = container.resolve<ILogger>('logger');
    return new IndexedDBTagRepository(logger, BASIC_HIGHLIGHT_DB_NAME);
  });

  container.registerSingleton('proTagRepository', () => {
    const logger = container.resolve<ILogger>('logger');
    return new IndexedDBTagRepository(logger, PRO_HIGHLIGHT_DB_NAME);
  });

  container.registerSingleton<ScopedTagRepository>('scopedTagRepository', () => {
    const basic = container.resolve<ITagRepository>('basicTagRepository' as never);
    const pro = container.resolve<ITagRepository>('proTagRepository' as never);
    return new ScopedTagRepository(basic, pro, 'basic');
  });

  container.registerSingleton('supabaseTagRepository', () => {
    const supabaseClient = container.resolve<SupabaseClient>('_supabaseClient');
    const authManager = container.resolve<IAuthManager>('authManager');
    const logger = container.resolve<ILogger>('logger');
    return new SupabaseTagRepository(supabaseClient, authManager, logger);
  });

  container.registerSingleton<IGroupRepository>('supabaseGroupRepository', () => {
    const supabaseClient = container.resolve<SupabaseClient>('_supabaseClient');
    const authManager = container.resolve<IAuthManager>('authManager');
    const logger = container.resolve<ILogger>('logger');
    return new SupabaseGroupRepository(supabaseClient, authManager, logger);
  });

  // ==================== Group Repositories (ADR-032) ====================

  /**
   * Basic local group store — guest / logged-out persistence.
   * Shares the basic highlight database; group stores added at v3.
   */
  container.registerSingleton<IGroupRepository>('basicGroupRepository', () => {
    const logger = container.resolve<ILogger>('logger');
    return new IndexedDBGroupRepository(logger, BASIC_HIGHLIGHT_DB_NAME);
  });

  /**
   * Pro local group store — account offline cache while signed in.
   * Shares the pro highlight database; group stores added at v3.
   */
  container.registerSingleton<IGroupRepository>('proGroupRepository', () => {
    const logger = container.resolve<ILogger>('logger');
    return new IndexedDBGroupRepository(logger, PRO_HIGHLIGHT_DB_NAME);
  });

  container.registerSingleton<TagService>('tagService', () => {
    const scopedTagRepository = container.resolve<ScopedTagRepository>(
      'scopedTagRepository' as never
    );
    const cloudTagRepository = container.resolve<SupabaseTagRepository>(
      'supabaseTagRepository' as never
    );
    const authManager = container.resolve<IAuthManager>('authManager');
    const logger = container.resolve<ILogger>('logger');
    return new TagService(
      scopedTagRepository,
      cloudTagRepository,
      () => authManager.isAuthenticated,
      logger
    );
  });

  container.registerSingleton<IDeviceLibraryUpload>('deviceLibraryUpload', () => {
    const authManager = container.resolve<IAuthManager>('authManager');
    const basicHighlights = container.resolve<IHighlightRepository>(
      'basicHighlightRepository' as never
    );
    const proHighlights = container.resolve<IHighlightRepository>(
      'proHighlightRepository' as never
    );
    const cloudHighlights = container.resolve<SupabaseHighlightRepository>(
      'supabaseHighlightRepository' as never
    );
    const basicTags = container.resolve<ITagRepository>('basicTagRepository' as never);
    const proTags = container.resolve<ITagRepository>('proTagRepository' as never);
    const cloudTags = container.resolve<SupabaseTagRepository>(
      'supabaseTagRepository' as never
    );
    const basicGroups = container.resolve<IGroupRepository>(
      'basicGroupRepository' as never
    );
    const proGroups = container.resolve<IGroupRepository>(
      'proGroupRepository' as never
    );
    const cloudGroups = container.resolve<IGroupRepository>(
      'supabaseGroupRepository' as never
    );
    const offlineQueue = container.resolve<OfflineQueueService>('offlineQueueService');
    const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
    const logger = container.resolve<ILogger>('logger');

    return new DeviceLibraryUpload(
      authManager,
      basicHighlights,
      proHighlights,
      cloudHighlights,
      basicTags,
      proTags,
      cloudTags,
      basicGroups,
      proGroups,
      cloudGroups,
      offlineQueue,
      repositoryFacade,
      logger
    );
  });

  // ==================== Tab Group Mirroring (Phase 3) ====================

  container.registerSingleton<TabGroupBindingStore>(
    'tabGroupBindingStore',
    () => tabGroupBindingStore
  );

  container.registerSingleton<DeviceIdService>(
    'deviceIdService',
    () => new DeviceIdService()
  );

  container.registerSingleton<TabGroupSyncService>('tabGroupSyncService', () => {
    const authManager = container.resolve<IAuthManager>('authManager');
    const basicGroups = container.resolve<IGroupRepository>('basicGroupRepository');
    const proGroups = container.resolve<IGroupRepository>('proGroupRepository');
    const bindingStore = container.resolve<TabGroupBindingStore>('tabGroupBindingStore');
    const deviceIdService = container.resolve<DeviceIdService>('deviceIdService');
    const logger = container.resolve<ILogger>('logger');
    const eventBus = container.resolve<IEventBus>('eventBus');
    const cloudRepository = container.resolve<IGroupRepository>(
      'supabaseGroupRepository' as never
    );
    const echoTracker = container.resolve<LocalWriteEchoTracker>(
      'localWriteEchoTracker' as never
    );
    const offlineQueue = container.resolve<OfflineQueueService>('offlineQueueService');

    const groupServiceFactory = (isAuthenticated: boolean) =>
      createScopedGroupService({
        isAuthenticated,
        basicRepository: basicGroups,
        proRepository: proGroups,
        logger,
        sync: {
          cloudRepository,
          isAuthenticated: () => authManager.isAuthenticated,
          echoTracker,
          enqueueOperation: (
            entity: GroupCloudEntity,
            type: GroupCloudOp,
            targetId: string,
            payload: PageGroup | PageGroupItem
          ) => offlineQueue.enqueue(type, targetId, payload, entity),
        },
      });

    return new TabGroupSyncService({
      authManager,
      basicGroups,
      proGroups,
      bindingStore,
      deviceIdService,
      logger,
      eventBus,
      groupServiceFactory,
      cloudGroups: cloudRepository,
      echoTracker,
      offlineQueue,
    });
  });
}
