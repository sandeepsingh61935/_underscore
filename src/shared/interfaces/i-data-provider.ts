import type { DomainCollection } from '@/shared/types/domain-collection';

export interface IDataProvider {
  getCollections(mode: string): Promise<DomainCollection[]>;
}
