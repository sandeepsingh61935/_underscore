/**
 * Generate a new highlight primary key.
 * Must be UUID — Supabase public.highlights.id is uuid.
 */
export function generateHighlightId(): string {
  return crypto.randomUUID();
}
