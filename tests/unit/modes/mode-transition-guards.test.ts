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

  it('allows pro to pro_xai without auth guard failure', async () => {
    await expect(executeTransitionGuard('pro', 'pro_xai', signedIn)).resolves.toBe(true);
  });
});
