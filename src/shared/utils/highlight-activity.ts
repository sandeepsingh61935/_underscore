/**
 * Recency for library lists: prefer updatedAt, fall back to createdAt.
 */
export function highlightActivityMs(input: {
  updatedAt?: Date | string | null;
  createdAt: Date | string;
}): number {
  const raw = input.updatedAt ?? input.createdAt;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Newest activity first. */
export function compareByHighlightActivityDesc(
  a: { updatedAt?: Date | string | null; createdAt: Date | string },
  b: { updatedAt?: Date | string | null; createdAt: Date | string }
): number {
  return highlightActivityMs(b) - highlightActivityMs(a);
}
