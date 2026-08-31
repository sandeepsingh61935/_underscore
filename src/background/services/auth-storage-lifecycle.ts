import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import type { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import { DEFAULT_MODE, MODE_STORAGE_KEY } from '@/shared/constants/mode-storage';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import type { ScopedTagRepository } from '@/shared/repositories/scoped-tag-repository';
import { LoggerFactory } from '@/shared/utils/logger';

const logger = LoggerFactory.getLogger('AuthStorageLifecycle');

async function defaultPersistGuestMode(): Promise<void> {
  const payload = { [MODE_STORAGE_KEY]: DEFAULT_MODE };
  const g = globalThis as {
    chrome?: { storage?: { local?: { set: (v: Record<string, unknown>) => unknown } } };
    browser?: { storage?: { local?: { set: (v: Record<string, unknown>) => unknown } } };
  };
  if (g.chrome?.storage?.local?.set) {
    await Promise.resolve(g.chrome.storage.local.set(payload));
    return;
  }
  if (g.browser?.storage?.local?.set) {
    await Promise.resolve(g.browser.storage.local.set(payload));
  }
}

export type AuthStorageEvent =
  { type: 'SIGNED_IN'; userId: string } | { type: 'SIGNED_OUT' };

export interface AuthStorageLifecycleDeps {
  scopedRepository: ScopedHighlightRepository;
  scopedTagRepository?: ScopedTagRepository;
  repositoryFacade: RepositoryFacade;
  cloudHydration?: Pick<ICloudHydrationService, 'hydrate'>;
  syncCursor?: Pick<LibrarySyncCursor, 'clear'>;
  echoTracker?: Pick<LocalWriteEchoTracker, 'clear'>;
  /** Persist Guest mode on sign-out (defaults to chrome.storage.local). */
  persistGuestMode?: () => Promise<void>;
}

/**
 * Auth-driven storage transitions: isolated Basic vs Pro local DBs.
 * Sign-in activates Pro scope then hydrates from cloud (no Basic merge).
 * Sign-out wipes Pro local DB and reactivates Basic scope.
 */
export async function handleAuthStorageEvent(
  event: AuthStorageEvent,
  deps: AuthStorageLifecycleDeps
): Promise<void> {
  const {
    scopedRepository,
    scopedTagRepository,
    repositoryFacade,
    cloudHydration,
    syncCursor,
    echoTracker,
    persistGuestMode,
  } = deps;

  if (event.type === 'SIGNED_IN') {
    await scopedRepository.activateScope('pro');
    scopedTagRepository?.activateScope('pro');
    try {
      if (cloudHydration) {
        await cloudHydration.hydrate();
      }
    } catch (err) {
      // Cloud hydrate is best-effort. Local pro scope + facade reload still apply.
      logger.error(
        'Cloud hydrate failed on sign-in; continuing with local Pro storage',
        err instanceof Error ? err : new Error(String(err))
      );
    }
    // Always reload from active (pro) store. Hydrate may no-op or fail without
    // reloading — leaving the facade stuck on pre-sign-in (basic) data.
    // Double reload after a successful hydrate is intentional and cheap.
    await repositoryFacade.reload();
    notifyLibraryDataChanged({ source: 'auth_sign_in' });
    return;
  }

  const proHighlights = await scopedRepository.queryScope('pro').findAll();
  const removedIds = proHighlights.map((highlight) => highlight.id);

  await scopedRepository.wipeProLocal();
  await scopedTagRepository?.wipeProLocal();
  await syncCursor?.clear();
  echoTracker?.clear();
  await scopedRepository.activateScope('basic');
  scopedTagRepository?.activateScope('basic');
  // Force Guest mode so UI/storage stay aligned (no Mode control in Settings).
  try {
    if (persistGuestMode) {
      await persistGuestMode();
    } else {
      await defaultPersistGuestMode();
    }
  } catch (err) {
    logger.error(
      'Failed to persist basic mode on sign-out',
      err instanceof Error ? err : new Error(String(err))
    );
  }
  await repositoryFacade.reload();
  notifyLibraryDataChanged({
    source: 'auth_sign_out',
    deletedCount: removedIds.length,
    removedIds,
  });
}
