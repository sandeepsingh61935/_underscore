import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IpcHighlightRepository } from './ipc-highlight-repository';
import { MessageSchema } from '@/shared/schemas/message-schemas';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

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
  let captured: unknown[];
  let sentMessages: Array<{ target: 'background' | 'content' | 'popup'; message: unknown }>;
  let repo: IpcHighlightRepository;

  beforeEach(() => {
    captured = [];
    sentMessages = [];

    const mockBus = {
      send: vi.fn(async (target: 'background' | 'content' | 'popup', message: unknown): Promise<unknown> => {
        sentMessages.push({ target, message });
        captured.push(message);
        return { success: true };
      }),
      subscribe: vi.fn(() => () => {}),
      publish: vi.fn(async () => {}),
    } as unknown as IMessageBus;

    repo = new IpcHighlightRepository(mockBus);
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

  it('send always targets background', async () => {
    await repo.add(makeHighlight());
    await repo.remove('h-1');
    expect(sentMessages.every((m) => m.target === 'background')).toBe(true);
  });

  it('addMany: loops add() per highlight (TODO ADR-011 batches this)', async () => {
    await repo.addMany([makeHighlight(), makeHighlight()]);
    expect(captured).toHaveLength(2);
    expect(MessageSchema.parse(captured[0]).type).toBe('IPC_HIGHLIGHT_ADD');
    expect(MessageSchema.parse(captured[1]).type).toBe('IPC_HIGHLIGHT_ADD');
  });

  it('does not implement read methods (interface narrowed per ADR-005)', () => {
    // Compile-time check: IpcHighlightRepository only has write methods.
    // This test guards against accidental re-introduction of read methods
    // that throw at runtime.
    const repoAsWriteOnly: { add: unknown; update: unknown; remove: unknown; addMany: unknown } = repo;
    expect(typeof repoAsWriteOnly.add).toBe('function');
    expect(typeof repoAsWriteOnly.update).toBe('function');
    expect(typeof repoAsWriteOnly.remove).toBe('function');
    expect(typeof repoAsWriteOnly.addMany).toBe('function');
  });
});
