/**
 * Library read/write seam (ADR-029).
 * Cloud adapter = Pro SoT. IDB / future native SQL = per-device cache.
 * In-memory adapter is for tests. Basic never uses this seam.
 */

export type LibraryHighlight = {
  id: string;
  url: string;
  text: string;
  tags: string[];
  notes: string;
  createdAtMs: number;
  encrypted: boolean;
};

export interface LibraryAccess {
  list(): Promise<LibraryHighlight[]>;
  get(id: string): Promise<LibraryHighlight | null>;
}

export class MemoryLibraryAccess implements LibraryAccess {
  constructor(private readonly rows: LibraryHighlight[] = []) {}

  async list(): Promise<LibraryHighlight[]> {
    return [...this.rows];
  }

  async get(id: string): Promise<LibraryHighlight | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
}
