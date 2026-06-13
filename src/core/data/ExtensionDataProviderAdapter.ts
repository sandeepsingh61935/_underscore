import type { IDataProvider } from '@/shared/interfaces/i-data-provider';
import type { DomainCollection } from '@/shared/types/domain-collection';
import type { EventBus } from '@/shared/utils/event-bus';

export class ExtensionDataProviderAdapter implements IDataProvider {
  constructor(private eventBus: EventBus) {}

  async getCollections(_mode: string): Promise<DomainCollection[]> {
    // Send IPC request to background worker via EventBus request-response
    return []; // TODO: Wire real IPC in Phase 5
  }
}
