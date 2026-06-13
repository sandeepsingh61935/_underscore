import { describe, it, expect } from 'vitest';
import { WebDataProviderAdapter } from '@/core/data/WebDataProviderAdapter';

describe('WebDataProviderAdapter', () => {
  it('should implement IDataProvider and return empty collections for now', async () => {
    const adapter = new WebDataProviderAdapter();

    const collections = await adapter.getCollections('cloud');
    expect(collections).toEqual([]);
  });
});
