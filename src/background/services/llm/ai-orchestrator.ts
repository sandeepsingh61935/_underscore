import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { LLMRegistry } from './llm-registry';
import type { LLMKeyStore } from './llm-key-store';
import { registerAiHandlers } from './ipc-handlers';

/**
 * Boots the AI IPC handlers. Constructor-injected dependencies (the
 * orchestrator follows the same pattern as BackgroundHighlightOrchestrator)
 * so that the SW boot script owns the wiring.
 */
export class AiOrchestrator {
  constructor(
    private readonly messageBus: IMessageBus,
    private readonly registry: LLMRegistry,
    private readonly keyStore: LLMKeyStore,
    private readonly logger: ILogger,
  ) {}

  initialize(): void {
    registerAiHandlers({ bus: this.messageBus as any, registry: this.registry, keyStore: this.keyStore });
    this.logger.info('[ai] handlers registered');
  }
}