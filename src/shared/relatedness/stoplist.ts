/**
 * @file stoplist.ts
 * @description Junk tags excluded from related-tag suggestions.
 */

/** Initial stoplist — extend only with clear junk labels. */
export const RELATED_TAG_STOPLIST: ReadonlySet<string> = new Set([
  'todo',
  'misc',
  'untagged',
  'test',
  'asdf',
  'something',
]);

export function isStoplistTag(tag: string): boolean {
  return RELATED_TAG_STOPLIST.has(tag.trim().toLowerCase());
}
