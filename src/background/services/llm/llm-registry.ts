import type { ILLMService } from '@/shared/interfaces/i-llm-service';

/**
 * Holds registered LLM provider implementations.
 * The DI container owns a single LLMRegistry instance; views/hooks
 * receive it through the container.
 */
export class LLMRegistry {
  private providers = new Map<ILLMService['providerName'], ILLMService>();
  private configured = new Set<ILLMService['providerName']>();

  register(provider: ILLMService): void {
    this.providers.set(provider.providerName, provider);
  }

  get(name: ILLMService['providerName']): ILLMService {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`LLM provider "${name}" is not registered.`);
    return provider;
  }

  setConfigured(name: ILLMService['providerName'], configured: boolean): void {
    if (configured) this.configured.add(name);
    else this.configured.delete(name);
  }

  list(): { name: ILLMService['providerName']; configured: boolean }[] {
    return Array.from(this.providers.keys()).map(name => ({
      name,
      configured: this.configured.has(name),
    }));
  }
}