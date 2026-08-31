import { MODE_NAMES } from '@/content/modes/mode-constants';
import type { ModeManager } from '@/content/modes/mode-manager';
import type { ModeStateManager } from '@/content/modes/mode-state-manager';
import type { ProMode } from '@/content/modes/pro-mode';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';

export interface ContentAuthSyncLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown> | Error): void;
}

export interface ContentAuthSyncDeps {
  modeStateManager: ModeStateManager;
  modeManager: ModeManager;
  repositoryFacade: RepositoryFacade;
  logger: ContentAuthSyncLogger;
  broadcastCount: () => void;
}

/**
 * React to auth changes in the content script.
 * Sign-out switches to guest mode (clears Pro DOM highlights) before reloading storage.
 * Sign-in re-restores Pro highlights when that mode is active.
 */
export async function handleContentAuthStateChanged(
  isAuthenticated: boolean,
  deps: ContentAuthSyncDeps
): Promise<void> {
  const { modeStateManager, modeManager, repositoryFacade, logger, broadcastCount } =
    deps;

  logger.info('[AUTH] Auth state changed', { isAuthenticated });

  if (!isAuthenticated) {
    try {
      await modeStateManager.setMode('basic', { isAuthenticated: false });
    } catch (err) {
      logger.warn('[AUTH] Failed to switch to basic on sign-out', err as Error);
    }
  }

  await repositoryFacade.reload();
  broadcastCount();

  if (isAuthenticated) {
    const currentMode = modeManager.getCurrentMode();
    if (currentMode.name === MODE_NAMES.PRO || currentMode.name === MODE_NAMES.PRO_XAI) {
      logger.info('[AUTH] Pro Mode active - triggering re-restoration');
      await (currentMode as ProMode).restore();
    }
  }
}
