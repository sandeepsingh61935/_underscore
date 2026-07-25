/**
 * Read-side contract for resolving highlight labels from the normalized
 * tag junction table, with optional fallback to legacy metadata.tags.
 */
export interface ITagLabelResolver {
  getLabelsForHighlights(highlightIds: string[]): Promise<Map<string, string[]>>;
  mergeWithMetadataFallback(junctionLabels?: string[], metadataTags?: string[]): string[] | undefined;
}
