import type { ILogger } from '@/shared/interfaces/i-logger';
import { IndexedDBHighlightRepository } from '@/background/repositories/indexed-db-highlight-repository';
import {
  BASIC_HIGHLIGHT_DB_NAME,
  LEGACY_HIGHLIGHT_DB_NAME,
} from '@/shared/constants/highlight-storage-scope';

/**
 * One-time migration: move pre-isolation `underscore_vault` rows into Basic DB.
 * Skips when Basic already has data or legacy store is empty.
 */
export async function migrateLegacyVaultToBasic(logger: ILogger): Promise<void> {
  const legacy = new IndexedDBHighlightRepository(logger, LEGACY_HIGHLIGHT_DB_NAME);
  const basic = new IndexedDBHighlightRepository(logger, BASIC_HIGHLIGHT_DB_NAME);

  const [legacyCount, basicCount] = await Promise.all([legacy.count(), basic.count()]);
  if (legacyCount === 0 || basicCount > 0) {
    return;
  }

  const highlights = await legacy.findAll();
  if (highlights.length === 0) {
    return;
  }

  await basic.addMany(highlights);
  await legacy.clear();
  logger.info('[HighlightMigration] Moved legacy vault highlights to Basic DB', {
    count: highlights.length,
  });
}
