import { registerAiHandlers } from './ipc-handlers';
import type { LlmKeyStoreHolder } from './llm-key-store-holder';
import { resolveConfiguredProvider } from './llm-provider-factory';
import type { BackgroundPageContentCache, PageContent } from './page-content-cache';
import type { LLMRegistry } from './llm-registry';
import { handleStreamChat } from './stream-relay';

import type { ILLMService, LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { PAGE_CONTENT_CACHED } from '@/shared/schemas/message-schemas';
import type { ILogger } from '@/shared/utils/logger';
import { canUseFeature, type FeatureGateContext } from '@/shared/utils/mode-capabilities';
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';

interface StreamChatRequestMessage {
  type: 'STREAM_CHAT_REQUEST';
  payload: {
    request: LLMRequest;
    provider?: ProviderName;
  };
}

interface StreamingPort {
  name: string;
  postMessage: (msg: { type: string; payload?: unknown }) => void;
  onMessage: { addListener: (cb: (msg: StreamChatRequestMessage) => void) => void };
  onDisconnect: { addListener: (cb: () => void) => void };
}

/**
 * Boots the AI IPC handlers. Constructor-injected dependencies (the
 * orchestrator follows the same pattern as BackgroundHighlightOrchestrator)
 * so that the SW boot script owns the wiring.
 */
export class AiOrchestrator {
  private resolveAiGateContext?: () => Promise<FeatureGateContext>;

  constructor(
    private readonly messageBus: IMessageBus,
    private readonly registry: LLMRegistry,
    private readonly keyStoreHolder: LlmKeyStoreHolder,
    private readonly pageContentCache: BackgroundPageContentCache,
    private readonly logger: ILogger,
  ) {}

  configureFeatureGate(resolver: () => Promise<FeatureGateContext>): void {
    this.resolveAiGateContext = resolver;
  }

  initialize(): void {
    registerAiHandlers({
      bus: this.messageBus,
      registry: this.registry,
      keyStoreHolder: this.keyStoreHolder,
      pageContentCache: this.pageContentCache,
      resolveAiGateContext: this.resolveAiGateContext,
    });
    this.registerPageContentIngest();
    this.registerStreamPort();
    this.logger.info('[ai] handlers registered');
  }

  private registerPageContentIngest(): void {
    this.messageBus.subscribe(PAGE_CONTENT_CACHED, (payload: unknown, sender) => {
      const tabId = sender.tab?.id;
      if (!tabId || !payload || typeof payload !== 'object') return;
      this.pageContentCache.set(tabId, payload as PageContent);
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.pageContentCache.deleteTab(tabId);
    });
  }

  private registerStreamPort(): void {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== 'llm-stream') return;

      const streamPort = port as unknown as StreamingPort;
      streamPort.onMessage.addListener((msg) => {
        void this.handleStreamRequest(streamPort, msg);
      });
    });
  }

  private async handleStreamRequest(port: StreamingPort, msg: StreamChatRequestMessage): Promise<void> {
    if (msg.type !== 'STREAM_CHAT_REQUEST') return;

    try {
      if (this.resolveAiGateContext) {
        const ctx = await this.resolveAiGateContext();
        const gate = canUseFeature('ai', ctx);
        if (!gate.allowed) {
          port.postMessage({
            type: 'ERROR',
            payload: { message: featureGateSubtitle(gate.reason) },
          });
          return;
        }
      }

      const { request, provider } = msg.payload;
      const providerInstance: ILLMService = await resolveConfiguredProvider(
        this.registry,
        this.keyStoreHolder.get(),
        provider,
      );
      await handleStreamChat(port, providerInstance, request);
    } catch (err) {
      this.logger.error('[ai] stream request failed', err as Error);
      try {
        port.postMessage({ type: 'ERROR', payload: { message: (err as Error).message } });
      } catch {
        // Port may already be closed.
      }
    }
  }
}
