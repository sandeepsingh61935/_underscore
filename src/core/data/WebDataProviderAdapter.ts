import type { IDataProvider } from '@/shared/interfaces/i-data-provider';
import type { DomainCollection } from '@/shared/types/domain-collection';

export class WebDataProviderAdapter implements IDataProvider {
  async getCollections(_mode: string): Promise<DomainCollection[]> {
    // Make direct Supabase REST/SDK call here
    return []; 
  }
}
