import { describe, expect, it } from 'vitest';

import { encodeSseEvent, parseSseBuffer } from '@/shared/llm/runtime/sse';

describe('SSE stream protocol (ADR-027)', () => {
  it('round-trips chunk events', () => {
    const encoded = encodeSseEvent({ type: 'CHUNK', payload: { delta: 'hi' } });
    const { events, rest } = parseSseBuffer(encoded);
    expect(rest).toBe('');
    expect(events).toEqual([{ type: 'CHUNK', payload: { delta: 'hi' } }]);
  });

  it('parses partial buffers then completes', () => {
    const full = encodeSseEvent({
      type: 'DONE',
      payload: { text: 'ok', inputTokens: 1, outputTokens: 2, durationMs: 3 },
    });
    const mid = Math.floor(full.length / 2);
    const first = parseSseBuffer(full.slice(0, mid));
    expect(first.events).toEqual([]);
    const second = parseSseBuffer(first.rest + full.slice(mid));
    expect(second.events).toHaveLength(1);
    expect(second.events[0]?.type).toBe('DONE');
  });

  it('parses error events', () => {
    const encoded = encodeSseEvent({
      type: 'ERROR',
      payload: { message: 'nope' },
    });
    const { events } = parseSseBuffer(encoded);
    expect(events).toEqual([{ type: 'ERROR', payload: { message: 'nope' } }]);
  });
});
