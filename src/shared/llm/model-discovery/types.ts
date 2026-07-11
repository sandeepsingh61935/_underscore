import type { ProviderModelOption } from '@/shared/llm/provider-models';

export interface ModelDiscoveryInput {
  apiKey?: string;
  apiBase?: string;
}

export interface ModelDiscoveryResult {
  models: ProviderModelOption[];
  error?: string;
}
