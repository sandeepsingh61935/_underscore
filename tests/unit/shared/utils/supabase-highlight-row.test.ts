import { describe, it, expect } from 'vitest';

import {
  parseHighlightTextFromCloud,
  serializeHighlightMetadataForCloud,
  serializeHighlightTextForCloud,
  serializeTimestampForCloud,
  transformHighlightRow,
} from '@/shared/utils/supabase-highlight-row';

describe('supabase-highlight-row', () => {
  it('serializes plaintext highlight text for cloud storage', () => {
    const serialized = serializeHighlightTextForCloud({
      id: '11111111-1111-4111-8111-111111111111',
      text: 'hello world',
      contentHash: 'a'.repeat(64),
      colorRole: 'yellow',
      type: 'underscore',
      ranges: [],
      createdAt: new Date(),
    });

    expect(serialized).toBe('hello world');
    const parsed = parseHighlightTextFromCloud(serialized);
    expect(parsed.text).toBe('hello world');
  });

  it('transforms supabase rows into HighlightDataV2', () => {
    const highlight = transformHighlightRow({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: '22222222-2222-4222-8222-222222222222',
      url: 'https://example.com',
      text: 'hello',
      color_role: 'blue',
      content_hash: 'a'.repeat(64),
      created_at: '2024-06-01T00:00:00.000Z',
      updated_at: '2024-06-02T00:00:00.000Z',
    });

    expect(highlight.url).toBe('https://example.com');
    expect(highlight.text).toBe('hello');
    expect(highlight.colorRole).toBe('blue');
    expect(highlight.userId).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('round-trips highlight notes and tags from metadata column', () => {
    const highlight = transformHighlightRow({
      id: '11111111-1111-4111-8111-111111111111',
      url: 'https://example.com',
      text: 'hello',
      color_role: 'yellow',
      content_hash: 'a'.repeat(64),
      created_at: '2024-06-01T00:00:00.000Z',
      metadata: { notes: 'Key definition', tags: ['research', 'comedy'] },
    });

    expect(highlight.metadata?.notes).toBe('Key definition');
    expect(highlight.metadata?.tags).toEqual(['research', 'comedy']);
  });

  it('round-trips sourceKind language and presentation from metadata column', () => {
    const highlight = transformHighlightRow({
      id: '11111111-1111-4111-8111-111111111111',
      url: 'https://example.com',
      text: 'int x = 1;',
      color_role: 'yellow',
      content_hash: 'a'.repeat(64),
      created_at: '2024-06-01T00:00:00.000Z',
      metadata: {
        sourceKind: 'code',
        language: 'cpp',
        presentation: { format: 'bullets' },
      },
    });

    expect(highlight.metadata?.sourceKind).toBe('code');
    expect(highlight.metadata?.language).toBe('cpp');
    expect(highlight.metadata?.presentation).toEqual({ format: 'bullets' });
  });

  it('serializes highlight metadata for cloud storage', () => {
    expect(
      serializeHighlightMetadataForCloud({
        notes: 'Key definition',
        tags: ['research'],
      })
    ).toEqual({ notes: 'Key definition', tags: ['research'] });

    expect(
      serializeHighlightMetadataForCloud({
        sourceKind: 'code',
        language: 'js',
        presentation: { format: 'code', language: 'js' },
      })
    ).toEqual({
      sourceKind: 'code',
      language: 'js',
      presentation: { format: 'code', language: 'js' },
    });
  });

  it('serializes timestamps from Date or ISO string', () => {
    expect(serializeTimestampForCloud(new Date('2024-01-01T00:00:00Z'))).toBe(
      '2024-01-01T00:00:00.000Z'
    );
    expect(serializeTimestampForCloud('2024-01-01T00:00:00.000Z')).toBe(
      '2024-01-01T00:00:00.000Z'
    );
  });
});
