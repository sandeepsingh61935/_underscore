import { LLMKeyStore } from '@/background/services/llm/llm-key-store';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

type KeyStoreTier = 'basic' | 'pro';

/**
 * Holds the active LLMKeyStore instance and reconfigures tier on auth changes.
 */
export class LlmKeyStoreHolder {
  private store: LLMKeyStore;
  private tier: KeyStoreTier = 'basic';

  constructor() {
    this.store = new LLMKeyStore('basic');
  }

  get(): LLMKeyStore {
    return this.store;
  }

  currentTier(): KeyStoreTier {
    return this.tier;
  }

  configureForAuth(isAuthenticated: boolean): void {
    const tier: KeyStoreTier = isAuthenticated ? 'pro' : 'basic';
    this.tier = tier;
    this.store = new LLMKeyStore(tier);
  }

  configureForMode(mode: ModeType): void {
    const isProFamily = mode === 'pro' || mode === 'pro_xai';
    this.configureForAuth(isProFamily);
  }
}
