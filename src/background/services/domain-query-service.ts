import type { RepositoryFacade } from '@/shared/repositories';

export class DomainQueryService {
  constructor(private facade: any) {}

  public async handleGetCollectionsRequest(mode?: string) {
    return this.facade.getCollections(mode);
  }

  public async handleGetHighlightsByDomainRequest(domain: string) {
    return this.facade.getHighlightsByDomain(domain);
  }

  public async handleGetDashboardDataRequest(mode?: string) {
    return this.facade.getDashboardData(mode);
  }
}
