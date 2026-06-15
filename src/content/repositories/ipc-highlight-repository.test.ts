import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IpcHighlightRepository } from './ipc-highlight-repository';
import { MessageSchema } from '@/shared/schemas/message-schemas';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function makeHighlight(): HighlightDataV2 {
  return {
    id: 'h-1',
    text: 'sample',
    contentHash: 'hash-1',
    colorRole: 'yellow' as const,
    type: 'underscore' as const,
    ranges: [],
    createdAt: new Date(),
    url: 'https://example.com',
  } as HighlightDataV2;
}

describe('IpcHighlightRepository IPC payload contract', () => {
  let captured: any[];
  let repo: IpcHighlightRepository;

  beforeEach(() => {
    captured = [];
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn((msg: unknown, cb: (resp?: any) => void) => {
          captured.push(msg);
          // Simulate success: no lastError, optional response.
          cb({ success: true, data: makeHighlight() });
        }),
        lastError: undefined,
      },
    };
    repo = new IpcHighlightRepository();
  });

  it('add: payload passes MessageSchema (has timestamp)', async () => {
    await repo.add(makeHighlight());
    expect(captured).toHaveLength(1);
    const parsed = MessageSchema.parse(captured[0]);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_ADD');
    expect(typeof parsed.timestamp).toBe('number');
    expect(parsed.timestamp).toBeGreaterThan(0);
  });

  it('update: payload passes MessageSchema', async () => {
    await repo.update('h-1', { text: 'new' });
    const parsed = MessageSchema.parse(captured[0]);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_UPDATE');
    expect(parsed.timestamp).toBeGreaterThan(0);
  });

  it('remove: payload passes MessageSchema', async () => {
    await repo.remove('h-1');
    const parsed = MessageSchema.parse(captured[0]);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_REMOVE');
    expect(parsed.timestamp).toBeGreaterThan(0);
  });

  it('findByUrl: payload passes MessageSchema', async () => {
    await repo.findByUrl('https://example.com');
    const parsed = MessageSchema.parse(captured[0]);
    expect(parsed.type).toBe('IPC_HIGHLIGHTS_FIND_BY_URL');
    expect(parsed.timestamp).toBeGreaterThan(0);
  });
});
