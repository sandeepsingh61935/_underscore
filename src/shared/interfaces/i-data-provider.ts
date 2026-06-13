import type { DomainCollectionV2 } from '@/shared/schemas/mode-state-schemas';

export interface IDataProvider {
  getCollections(mode: string): Promise<DomainCollectionV2[]>;
}
