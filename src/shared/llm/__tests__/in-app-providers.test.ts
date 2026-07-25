import { describe, it, expect } from 'vitest';

import {
  IN_APP_LLM_PROVIDER_ORDER,
  isInAppLlmProvider,
  parseInAppLlmProvider,
} from '../in-app-providers';

describe('in-app providers', () => {
  it('lists only standard BYOK + local backends', () => {
    expect([...IN_APP_LLM_PROVIDER_ORDER]).toEqual([
      'openai',
      'anthropic',
      'gemini',
      'openrouter',
      'ollama',
    ]);
  });

  it('rejects agent hosts and unknown ids', () => {
    expect(isInAppLlmProvider('cursor')).toBe(false);
    expect(isInAppLlmProvider('minimax')).toBe(false);
    expect(parseInAppLlmProvider('cursor')).toBeNull();
    expect(parseInAppLlmProvider('openai')).toBe('openai');
  });
});
