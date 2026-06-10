export interface ModeEntry {
  id: string;
  family: 'a' | 'b' | 'c' | 'd';
  name: string;
  tag: string;
  blurb: string;
  motif: string;
  accent: string;
  persistence: 'none' | 'local' | 'cloud';
  signin: 'none' | 'required' | 'optional';
  ttl: number | null;
}

export const MODES: ReadonlyArray<ModeEntry> = [
  { id: 'ephemeral', family: 'a', name: 'Ephemeral', tag: 'no save', blurb: '', motif: '', accent: 'ink', persistence: 'none', signin: 'none', ttl: null },
  { id: 'local', family: 'b', name: 'Local', tag: '24h', blurb: '', motif: '', accent: 'ink', persistence: 'local', signin: 'none', ttl: 24 * 60 * 60 * 1000 },
  { id: 'cloud', family: 'c', name: 'Cloud', tag: 'sync', blurb: '', motif: '', accent: 'accent', persistence: 'cloud', signin: 'required', ttl: null },
  { id: 'ai', family: 'd', name: 'AI', tag: 'future', blurb: '', motif: '', accent: 'ink', persistence: 'cloud', signin: 'required', ttl: null },
];

export function modeById(id: string): ModeEntry | null {
  return MODES.find((m) => m.id === id) ?? null;
}
