/**
 * Construct an ILLMService from explicit config (no key store).
 * Used by web browser runtime, Pages Function proxy, and tests.
 */

import { AnthropicProvider } from './anthropic-provider';
import { GeminiProvider } from './gemini-provider';
import { OllamaProvider } from './ollama-provider';
import { OpenAIProvider } from './openai-provider';
import { OpenRouterProvider } from './openrouter-provider';
import { XaiProvider } from './xai-provider';

import type { ILLMService, ProviderName } from '@/shared/interfaces/i-llm-service';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';
import { getDefaultModelId } from '@/shared/llm/provider-models';

export interface ProviderConfigInput {
  provider: ProviderName;
  apiKey?: string;
  apiBase?: string;
  model?: string;
}

const NO_PROVIDER_MESSAGE =
  'No model configured. Open Settings → Models & providers and add OpenAI, Anthropic, Gemini, xAI (Grok), OpenRouter, or Ollama.';

/**
 * Fixed cloud bases only — no arbitrary user apiBase for cloud (SSRF / ADR-027).
 * Ollama may use apiBase (localhost).
 */
export function buildProviderFromConfig(input: ProviderConfigInput): ILLMService {
  const { provider } = input;
  if (!isInAppLlmProvider(provider)) {
    throw new Error(NO_PROVIDER_MESSAGE);
  }

  const model = input.model?.trim() || getDefaultModelId(provider);

  switch (provider) {
    case 'ollama':
      return new OllamaProvider({
        apiBase: input.apiBase?.trim() || undefined,
        model,
      });
    case 'anthropic': {
      const key = input.apiKey?.trim();
      if (!key) throw new Error('API key not configured');
      return new AnthropicProvider({ apiKey: key, model });
    }
    case 'gemini': {
      const key = input.apiKey?.trim();
      if (!key) throw new Error('API key not configured');
      return new GeminiProvider({ apiKey: key, model });
    }
    case 'openai': {
      const key = input.apiKey?.trim();
      if (!key) throw new Error('API key not configured');
      if (/^key_/i.test(key)) {
        throw new Error(
          'Stored key looks like a Cursor agent key, not an OpenAI API key. '
          + 'Clear it and paste a key from platform.openai.com, or use OpenRouter / Anthropic / Gemini / Ollama.',
        );
      }
      return new OpenAIProvider({ apiKey: key, model });
    }
    case 'xai': {
      const key = input.apiKey?.trim();
      if (!key) throw new Error('xAI API key required (console.x.ai)');
      return new XaiProvider({ apiKey: key, model });
    }
    case 'openrouter': {
      const key = input.apiKey?.trim();
      if (!key) {
        throw new Error(
          'OpenRouter API key required (free at openrouter.ai/keys). '
          + 'Free models do not charge credits but still need a key.',
        );
      }
      return new OpenRouterProvider({ apiKey: key, model });
    }
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown LLM provider: ${String(exhaustive)}`);
    }
  }
}
