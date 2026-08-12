import { describe, expect, it } from 'vitest';

import { autoTitleFromUserMessage } from '../chat-title';

describe('autoTitleFromUserMessage', () => {
  it('returns New chat for empty input', () => {
    expect(autoTitleFromUserMessage('')).toBe('New chat');
    expect(autoTitleFromUserMessage('   ')).toBe('New chat');
  });

  it('collapses whitespace and keeps short titles', () => {
    expect(autoTitleFromUserMessage('  Hello   world  ')).toBe('Hello world');
  });

  it('truncates long titles with ellipsis', () => {
    const long = 'a'.repeat(100);
    const title = autoTitleFromUserMessage(long, 20);
    expect(title.length).toBeLessThanOrEqual(20);
    expect(title.endsWith('…')).toBe(true);
  });
});
