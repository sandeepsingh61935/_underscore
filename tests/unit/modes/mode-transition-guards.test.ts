import { describe, expect, it } from 'vitest';

import {
  executeTransitionGuard,
  type TransitionGuardContext,
} from '@/content/modes/mode-transition-rules';

describe('transition guards (pro boundaries)', () => {
  const guest: TransitionGuardContext = { isAuthenticated: false };
  const signedIn: TransitionGuardContext = { isAuthenticated: true };

  it('blocks basic to pro when guest', async () => {
    await expect(executeTransitionGuard('basic', 'pro', guest)).resolves.toBe(false);
  });

  it('allows basic to pro when signed in', async () => {
    await expect(executeTransitionGuard('basic', 'pro', signedIn)).resolves.toBe(true);
  });

  it('blocks pro to basic when signed in', async () => {
    await expect(executeTransitionGuard('pro', 'basic', signedIn)).resolves.toBe(false);
  });

  it('blocks pro to pro_xai when signed in but not paid', async () => {
    await expect(
      executeTransitionGuard('pro', 'pro_xai', {
        isAuthenticated: true,
        isPaidActive: false,
      })
    ).resolves.toBe(false);
  });

  it('allows pro to pro_xai when entitled paid', async () => {
    await expect(
      executeTransitionGuard('pro', 'pro_xai', {
        isAuthenticated: true,
        isPaidActive: true,
      })
    ).resolves.toBe(true);
  });
});
