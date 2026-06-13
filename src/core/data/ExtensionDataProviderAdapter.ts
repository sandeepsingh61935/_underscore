import type { IDataProvider } from '@/shared/interfaces/i-data-provider';
import type { DomainCollectionV2 } from '@/shared/schemas/mode-state-schemas';
import type { EventBus } from '@/shared/utils/event-bus';

export class ExtensionDataProviderAdapter implements IDataProvider {
  constructor(private eventBus: EventBus) {}

  async getCollections(_mode: string): Promise<DomainCollectionV2[]> {
    // Send IPC request to background worker via EventBus request-response
    return []; // TODO: Wire real IPC in Phase 5
  }
}
