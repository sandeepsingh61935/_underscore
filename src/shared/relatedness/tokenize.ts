/**
 * @file tokenize.ts
 * @description Lightweight tokenizer for BM25 over highlight text/notes.
 */

const STOP = new Set(
  'a an the is are was were be been being to of in on for and or as at by with from that this it its into our your their we you they not no'.split(
    ' ',
  ),
);

/** Lowercase alphanumeric tokens; drops stopwords and length ≤ 2. */
export function tokenize(s: string): string[] {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Readable corpus text for BM25; encrypted/unreadable bodies contribute nothing. */
export function readableCorpusText(doc: {
  text: string;
  notes: string;
  encrypted?: boolean;
}): string {
  if (doc.encrypted) return '';
  const text = typeof doc.text === 'string' ? doc.text : '';
  const notes = typeof doc.notes === 'string' ? doc.notes : '';
  // Treat empty ciphertext-shaped bodies as unreadable even without the flag.
  return `${text} ${notes}`.trim();
}
