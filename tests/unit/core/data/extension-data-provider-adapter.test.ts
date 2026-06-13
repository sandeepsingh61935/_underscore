import { describe, it, expect } from 'vitest';
import { ExtensionDataProviderAdapter } from '@/core/data/ExtensionDataProviderAdapter';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

describe('ExtensionDataProviderAdapter', () => {
  it('should implement IDataProvider and return empty collections for now', async () => {
    const logger = new ConsoleLogger('test', LogLevel.NONE);
    const eventBus = new EventBus(logger);
    const adapter = new ExtensionDataProviderAdapter(eventBus);

    const collections = await adapter.getCollections('cloud');
    expect(collections).toEqual([]);
  });
});
