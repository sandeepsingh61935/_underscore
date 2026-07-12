import { describe, expect, it, vi, beforeEach } from 'vitest';

import { handleContentAuthStateChanged } from '@/content/services/content-auth-sync';
import type { ModeManager } from '@/content/modes/mode-manager';
import type { ModeStateManager } from '@/content/modes/mode-state-manager';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';

function makeDeps(overrides: Partial<{
  modeName: string;
  setMode: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
}> = {}) {
  const modeStateManager = {
    setMode: overrides.setMode ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as ModeStateManager;

  const currentMode = {
    name: overrides.modeName ?? 'pro',
    restore: overrides.restore ?? vi.fn().mockResolvedValue(undefined),
  };

  const modeManager = {
    getCurrentMode: vi.fn().mockReturnValue(currentMode),
  } as unknown as ModeManager;

  const repositoryFacade = {
    reload: vi.fn().mockResolvedValue(undefined),
  } as unknown as RepositoryFacade;

  const broadcastCount = vi.fn();
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
  };

  return {
    modeStateManager,
    modeManager,
    currentMode,
    repositoryFacade,
    broadcastCount,
    logger,
    deps: {
      modeStateManager,
      modeManager,
      repositoryFacade,
      broadcastCount,
      logger,
    },
  };
}

describe('handleContentAuthStateChanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('on sign-out switches to basic and does not restore Pro highlights', async () => {
    const { modeStateManager, currentMode, deps } = makeDeps({ modeName: 'pro' });

    await handleContentAuthStateChanged(false, deps);

    expect(modeStateManager.setMode).toHaveBeenCalledWith('basic', { isAuthenticated: false });
    expect(deps.repositoryFacade.reload).toHaveBeenCalled();
    expect(deps.broadcastCount).toHaveBeenCalled();
    expect(currentMode.restore).not.toHaveBeenCalled();
  });

  it('on sign-in restores Pro highlights when Pro mode is active', async () => {
    const restore = vi.fn().mockResolvedValue(undefined);
    const { currentMode, modeStateManager, deps } = makeDeps({ modeName: 'pro', restore });

    await handleContentAuthStateChanged(true, deps);

    expect(modeStateManager.setMode).not.toHaveBeenCalled();
    expect(currentMode.restore).toHaveBeenCalled();
    expect(deps.repositoryFacade.reload).toHaveBeenCalled();
  });

  it('on sign-in restores Pro+xAI highlights when that mode is active', async () => {
    const restore = vi.fn().mockResolvedValue(undefined);
    const { currentMode, deps } = makeDeps({ modeName: 'pro_xai', restore });

    await handleContentAuthStateChanged(true, deps);

    expect(currentMode.restore).toHaveBeenCalled();
  });

  it('continues reload when switching to basic fails on sign-out', async () => {
    const setMode = vi.fn().mockRejectedValue(new Error('transition blocked'));
    const { deps } = makeDeps({ setMode });

    await handleContentAuthStateChanged(false, deps);

    expect(deps.logger.warn).toHaveBeenCalled();
    expect(deps.repositoryFacade.reload).toHaveBeenCalled();
    expect(deps.broadcastCount).toHaveBeenCalled();
  });
});
