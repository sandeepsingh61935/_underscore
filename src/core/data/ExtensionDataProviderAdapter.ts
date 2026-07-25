import type { IDataProvider } from '@/shared/interfaces/i-data-provider';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import type { CollectionSummary } from '@/shared/services/highlight-query-service';
import type { DomainCollection } from '@/shared/types/domain-collection';
import type { EventBus } from '@/shared/utils/event-bus';

export class ExtensionDataProviderAdapter implements IDataProvider {
  constructor(_eventBus: EventBus, private readonly messageBus?: IMessageBus) {}

  async getCollections(mode: string): Promise<DomainCollection[]> {
    if (!this.messageBus) {
      return [];
    }
    try {
      const response = await this.messageBus.send<MessageResponse<{ collections: CollectionSummary[] }>>(
        'background',
        {
          type: 'GET_COLLECTIONS',
          payload: { mode },
          timestamp: Date.now(),
        }
      );
      if (!response?.success || !response.data) {
        return [];
      }
      return response.data.collections.map((c) => ({
        id: c.domain,
        domain: c.domain,
        highlightCount: c.highlightCount,
        lastActive: c.lastActive ? new Date(c.lastActive) : undefined,
      }));
    } catch {
      return [];
    }
  }
}
