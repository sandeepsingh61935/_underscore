import { describe, it, expect } from 'vitest';
import {
  highlightActivityMs,
  compareByHighlightActivityDesc,
} from './highlight-activity';

describe('highlightActivityMs', () => {
  it('uses updatedAt when present', () => {
    const ms = highlightActivityMs({
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    });
    expect(ms).toBe(new Date('2024-06-01T00:00:00.000Z').getTime());
  });

  it('falls back to createdAt when updatedAt missing', () => {
    const ms = highlightActivityMs({
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(ms).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
  });
});

describe('compareByHighlightActivityDesc', () => {
  it('orders newer activity before older', () => {
    const older = { createdAt: '2024-01-01T00:00:00.000Z' };
    const newerEdit = {
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2024-12-01T00:00:00.000Z',
    };
    const list = [older, newerEdit].sort(compareByHighlightActivityDesc);
    expect(list[0]).toBe(newerEdit);
    expect(list[1]).toBe(older);
  });
});
