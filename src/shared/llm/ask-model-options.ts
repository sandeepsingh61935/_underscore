/**
 * Pure helpers for Ask model chip (Layer B).
 * Options = configured providers only; empty enablement = all.
 */

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  isProviderPreferenceEnabled,
  type AiPreferences,
} from '@/shared/llm/ai-preferences';
import { IN_APP_LLM_PROVIDER_ORDER } from '@/shared/llm/in-app-providers';
import { getDefaultModelId } from '@/shared/llm/provider-models';

export type AskModelOption = {
  provider: ProviderName;
  modelId: string;
  /** Provider display name (e.g. OpenAI). */
  providerLabel: string;
  /** Short model id for secondary line. */
  modelLabel: string;
  /** Chip / menu primary: "OpenAI · gpt-4o-mini". */
  label: string;
};

export type AskModelProviderMeta = {
  label: string;
};

/**
 * Build selectable Ask models from a configured map.
 * @param configured - only providers with keys (or Ollama verified)
 * @param models - preferred model id per provider (fallback catalog default)
 * @param meta - provider labels
 * @param enablement - account enablement; empty = all
 */
export function listAskModelOptions(
  configured: ReadonlyArray<ProviderName>,
  models: Partial<Record<ProviderName, string | null | undefined>>,
  meta: Record<ProviderName, AskModelProviderMeta>,
  enablement: Pick<AiPreferences, 'enabledProviders'> = { enabledProviders: [] },
): AskModelOption[] {
  const set = new Set(configured);
  const out: AskModelOption[] = [];
  for (const provider of IN_APP_LLM_PROVIDER_ORDER) {
    if (!set.has(provider)) continue;
    if (!isProviderPreferenceEnabled(enablement, provider)) continue;
    const modelId = models[provider]?.trim() || getDefaultModelId(provider);
    const providerLabel = meta[provider]?.label ?? provider;
    out.push({
      provider,
      modelId,
      providerLabel,
      modelLabel: modelId,
      label: `${providerLabel} · ${modelId}`,
    });
  }
  return out;
}

/**
 * Active option for chip + ask: stored active if selectable, else first option.
 * Same resolution spirit as resolveConfiguredProvider (active → first configured).
 */
export function resolveActiveAskOption(
  options: ReadonlyArray<AskModelOption>,
  activeProvider: ProviderName | null | undefined,
): AskModelOption | null {
  if (!options.length) return null;
  if (activeProvider) {
    const hit = options.find((o) => o.provider === activeProvider);
    if (hit) return hit;
  }
  return options[0] ?? null;
}
