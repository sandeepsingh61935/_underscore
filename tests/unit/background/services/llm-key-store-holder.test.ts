import { describe, expect, it } from 'vitest';

import { LlmKeyStoreHolder } from '@/background/services/llm/llm-key-store-holder';

describe('LlmKeyStoreHolder', () => {
  it('starts on basic tier for guests', () => {
    const holder = new LlmKeyStoreHolder();
    expect(holder.currentTier()).toBe('basic');
  });

  it('switches to pro tier on sign-in configuration', () => {
    const holder = new LlmKeyStoreHolder();
    holder.configureForAuth(true);
    expect(holder.currentTier()).toBe('pro');
  });

  it('reverts to basic tier on sign-out configuration', () => {
    const holder = new LlmKeyStoreHolder();
    holder.configureForAuth(true);
    holder.configureForAuth(false);
    expect(holder.currentTier()).toBe('basic');
  });
});
