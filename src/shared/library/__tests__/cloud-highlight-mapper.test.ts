import { describe, expect, it } from 'vitest';

import { mapCloudBodyText, resolveCloudHighlightTags } from '../cloud-highlight-mapper';

describe('resolveCloudHighlightTags', () => {
  it('prefers junction labels and ignores metadata when junction is present', () => {
    expect(
      resolveCloudHighlightTags(['Alpha', 'alpha', 'Beta'], ['legacy', 'other'])
    ).toEqual(['alpha', 'beta']);
  });

  it('falls back to metadata.tags when junction is empty', () => {
    expect(resolveCloudHighlightTags([], ['Keep', 'keep'])).toEqual(['keep']);
    expect(resolveCloudHighlightTags(null, ['solo'])).toEqual(['solo']);
  });
});

describe('mapCloudBodyText', () => {
  it('returns plaintext when the text column is present', () => {
    expect(mapCloudBodyText({ text: 'hello', text_encrypted: 'cipher' })).toEqual({
      text: 'hello',
      encrypted: false,
    });
  });

  it('does not invent plaintext for ciphertext-only rows', () => {
    expect(mapCloudBodyText({ text: '', text_encrypted: 'abc' })).toEqual({
      text: '',
      encrypted: true,
    });
  });

  it('treats ADR013 envelopes in text as encrypted (no plaintext leak)', () => {
    expect(mapCloudBodyText({ text: '[ADR013:{"iv":"x","ct":"y"}]' })).toEqual({
      text: '',
      encrypted: true,
    });
  });
});
