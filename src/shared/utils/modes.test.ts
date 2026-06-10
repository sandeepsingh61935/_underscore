import { describe, expect, it } from 'vitest';

import { MODES, modeById } from './modes';

describe('MODES registry', () => {
  it('contains exactly the four canonical mode ids', () => {
    expect(MODES.map((m) => m.id)).toEqual(['ephemeral', 'local', 'cloud', 'ai']);
  });

  it('modeById returns the matching entry for known ids and null for unknown', () => {
    expect(modeById('ephemeral')?.id).toBe('ephemeral');
    expect(modeById('local')?.id).toBe('local');
    expect(modeById('cloud')?.id).toBe('cloud');
    expect(modeById('ai')?.id).toBe('ai');
    expect(modeById('nope')).toBeNull();
    expect(modeById('')).toBeNull();
  });

  it('every entry has non-empty id/family/name/tag and a valid accent', () => {
    for (const m of MODES) {
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.family.length).toBeGreaterThan(0);
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.tag.length).toBeGreaterThan(0);
      expect(['ink', 'accent']).toContain(m.accent);
    }
  });
});
