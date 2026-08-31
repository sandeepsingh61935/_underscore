/**
 * One-shot migration wipe: clears local highlight stores and legacy crypto keys.
 * User should export library before invoking (see docs/implementation-plans/crypto-removal/migration.md).
 */

import {
  BASIC_HIGHLIGHT_DB_NAME,
  LEGACY_HIGHLIGHT_DB_NAME,
  PRO_HIGHLIGHT_DB_NAME,
} from '@/shared/constants/highlight-storage-scope';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';

const LEGACY_CRYPTO_PREFIXES = ['key_manager_', 'llm.', 'llm.installKey'];

export interface ClearHighlightDataResult {
  clearedLocal: boolean;
  removedStorageKeys: number;
}

export async function clearHighlightData(
  repositoryFacade: RepositoryFacade,
  scopedRepository: ScopedHighlightRepository,
  logger: ILogger
): Promise<ClearHighlightDataResult> {
  await repositoryFacade.clearPersisted();
  await scopedRepository.activateScope('basic');

  await deleteIndexedDb(BASIC_HIGHLIGHT_DB_NAME);
  await deleteIndexedDb(PRO_HIGHLIGHT_DB_NAME);
  await deleteIndexedDb(LEGACY_HIGHLIGHT_DB_NAME);

  const all = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(all).filter((key) =>
    LEGACY_CRYPTO_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }

  await repositoryFacade.reload();

  logger.info('[ClearHighlightData] Local highlight data wiped', {
    removedStorageKeys: keysToRemove.length,
  });

  return { clearedLocal: true, removedStorageKeys: keysToRemove.length };
}

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
