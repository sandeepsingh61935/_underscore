import type { IDataProvider } from '@/shared/interfaces/i-data-provider';
import type { DomainCollectionV2 } from '@/shared/schemas/mode-state-schemas';

export class WebDataProviderAdapter implements IDataProvider {
  async getCollections(_mode: string): Promise<DomainCollectionV2[]> {
    // Make direct Supabase REST/SDK call here
    return []; 
  }
}
