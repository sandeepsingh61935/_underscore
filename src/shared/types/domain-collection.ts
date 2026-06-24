export interface DomainCollection {
  id: string;
  domain: string;
  highlightCount: number;
  /**
   * Most recent highlight timestamp for this domain. Optional because
   * the read-side query service does not currently compute it (the
   * GET_COLLECTIONS handler returns CollectionSummary, which omits
   * timestamps). Library view falls back to an empty subtitle when
   * absent. Add a `lastActive` field to HighlightQueryService.getCollections
   * to populate this when needed.
   */
  lastActive?: Date;
}
