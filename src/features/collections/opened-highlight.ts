/** Snapshot of a library highlight opened into the quote page. */
export type OpenedHighlight = {
  id: string;
  text: string;
  domain: string;
  path?: string;
  url?: string;
  notes?: string;
  tags?: string[];
};
