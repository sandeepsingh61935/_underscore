import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import type { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import type { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';

export type AuthStorageEvent =
  | { type: 'SIGNED_IN'; userId: string }
  | { type: 'SIGNED_OUT' };

export interface AuthStorageLifecycleDeps {
  scopedRepository: ScopedHighlightRepository;
  repositoryFacade: RepositoryFacade;
  cloudHydration?: Pick<ICloudHydrationService, 'hydrate'>;
  syncCursor?: Pick<LibrarySyncCursor, 'clear'>;
  echoTracker?: Pick<LocalWriteEchoTracker, 'clear'>;
}

/**
 * Auth-driven storage transitions: isolated Basic vs Pro local DBs.
 * Sign-in activates Pro scope then hydrates from cloud (no Basic merge).
 * Sign-out wipes Pro local DB and reactivates Basic scope.
 */
export async function handleAuthStorageEvent(
  event: AuthStorageEvent,
  deps: AuthStorageLifecycleDeps,
): Promise<void> {
  const { scopedRepository, repositoryFacade, cloudHydration, syncCursor, echoTracker } = deps;

  if (event.type === 'SIGNED_IN') {
    await scopedRepository.activateScope('pro');
    if (cloudHydration) {
      await cloudHydration.hydrate();
    }
    return;
  }

  await scopedRepository.wipeProLocal();
  await syncCursor?.clear();
  echoTracker?.clear();
  await scopedRepository.activateScope('basic');
  await repositoryFacade.reload();
  notifyLibraryDataChanged({ source: 'auth_sign_out' });
}
