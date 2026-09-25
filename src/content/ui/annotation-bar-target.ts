/**
 * @file annotation-bar-target.ts
 * @description Decides whether to open the annotation bar for a selection highlight.
 */

export function planAnnotationBarOpen(input: {
  overlappingCount: number;
  createdId: string | null;
}): string | null {
  if (input.overlappingCount > 0) return null;
  return input.createdId;
}
