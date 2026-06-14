

export class DomainQueryService {
  constructor(private facade: any) {}

  public async handleGetCollectionsRequest(mode?: string) {
    if (this.facade.reload) {
      await this.facade.reload();
    }
    return this.facade.getCollections(mode);
  }

  public async handleGetHighlightsByDomainRequest(domain: string, _mode?: string) {
    if (this.facade.reload) {
      await this.facade.reload();
    }
    return this.facade.getHighlightsByDomain(domain);
  }

  public async handleGetDashboardDataRequest(mode?: string) {
    if (this.facade.reload) {
      await this.facade.reload();
    }
    return this.facade.getDashboardData(mode);
  }
}
