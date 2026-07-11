import { describe, it, expect } from 'vitest';

import { getDefaultModelId, resolveProviderModel } from '@/shared/llm/provider-models';

describe('provider-models', () => {
  it('returns catalog default per provider', () => {
    expect(getDefaultModelId('openrouter')).toBe('openrouter/free');
    expect(getDefaultModelId('anthropic')).toBe('claude-sonnet-4-6');
  });

  it('resolveProviderModel prefers stored value', () => {
    expect(resolveProviderModel('openrouter', 'nvidia/nemotron-nano-9b-v2:free'))
      .toBe('nvidia/nemotron-nano-9b-v2:free');
    expect(resolveProviderModel('openrouter', null)).toBe(getDefaultModelId('openrouter'));
  });
});
