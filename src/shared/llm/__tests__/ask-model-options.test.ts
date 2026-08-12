import { describe, expect, it } from 'vitest';

import {
  listAskModelOptions,
  resolveActiveAskOption,
} from '@/shared/llm/ask-model-options';

const META = {
  openai: { label: 'OpenAI' },
  anthropic: { label: 'Anthropic' },
  gemini: { label: 'Google' },
  openrouter: { label: 'OpenRouter' },
  ollama: { label: 'Ollama' },
} as const;

describe('listAskModelOptions', () => {
  it('returns only configured providers in canonical order', () => {
    const opts = listAskModelOptions(
      ['ollama', 'openai'],
      { openai: 'gpt-4o-mini', ollama: 'llama3.2' },
      META,
    );
    expect(opts.map((o) => o.provider)).toEqual(['openai', 'ollama']);
    expect(opts[0]!.label).toBe('OpenAI · gpt-4o-mini');
  });

  it('empty enablement includes all configured', () => {
    const opts = listAskModelOptions(['anthropic'], {}, META, {
      enabledProviders: [],
    });
    expect(opts).toHaveLength(1);
    expect(opts[0]!.provider).toBe('anthropic');
  });

  it('non-empty enablement filters configured list', () => {
    const opts = listAskModelOptions(
      ['openai', 'anthropic'],
      {},
      META,
      { enabledProviders: ['anthropic'] },
    );
    expect(opts.map((o) => o.provider)).toEqual(['anthropic']);
  });

  it('uses catalog default when model missing', () => {
    const opts = listAskModelOptions(['gemini'], {}, META);
    expect(opts[0]!.modelId).toBe('gemini-2.0-flash');
  });
});

describe('resolveActiveAskOption', () => {
  it('picks active when present', () => {
    const opts = listAskModelOptions(['openai', 'anthropic'], {}, META);
    const active = resolveActiveAskOption(opts, 'anthropic');
    expect(active?.provider).toBe('anthropic');
  });

  it('falls back to first option when active missing', () => {
    const opts = listAskModelOptions(['openai', 'anthropic'], {}, META);
    const active = resolveActiveAskOption(opts, 'ollama');
    expect(active?.provider).toBe('openai');
  });

  it('returns null when no options', () => {
    expect(resolveActiveAskOption([], 'openai')).toBeNull();
  });
});
