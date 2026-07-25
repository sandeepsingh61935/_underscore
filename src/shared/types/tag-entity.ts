/**
 * @file tag-entity.ts
 * @description Normalized per-user label (tag) entity.
 */

export interface TagEntity {
  id: string;
  name: string;
  createdAt: Date;
}

export interface HighlightTagLink {
  highlightId: string;
  tagId: string;
}
