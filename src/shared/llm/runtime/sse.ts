/**
 * SSE encode/decode for normalized LLM stream events (ADR-027).
 */

import type { LLMResult } from '@/shared/interfaces/i-llm-service';
import type { LlmStreamEvent } from './stream-protocol';

const EVENT_NAME: Record<LlmStreamEvent['type'], string> = {
  CHUNK: 'chunk',
  DONE: 'done',
  ERROR: 'error',
};

const NAME_TO_TYPE: Record<string, LlmStreamEvent['type']> = {
  chunk: 'CHUNK',
  done: 'DONE',
  error: 'ERROR',
};

/** Format one SSE event block. */
export function encodeSseEvent(event: LlmStreamEvent): string {
  const name = EVENT_NAME[event.type];
  const data = JSON.stringify(event.payload);
  return `event: ${name}\ndata: ${data}\n\n`;
}

/**
 * Parse SSE buffer into complete events. Returns remaining incomplete buffer
 * and decoded app events.
 */
export function parseSseBuffer(buffer: string): {
  events: LlmStreamEvent[];
  rest: string;
} {
  const events: LlmStreamEvent[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';

  for (const block of parts) {
    if (!block.trim()) continue;
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    const dataRaw = dataLines.join('\n');
    if (!dataRaw) continue;
    let payload: unknown;
    try {
      payload = JSON.parse(dataRaw);
    } catch {
      continue;
    }
    const type = NAME_TO_TYPE[eventName];
    if (!type) continue;
    if (type === 'CHUNK') {
      const delta = (payload as { delta?: string })?.delta;
      if (typeof delta !== 'string') continue;
      events.push({ type: 'CHUNK', payload: { delta } });
    } else if (type === 'DONE') {
      events.push({ type: 'DONE', payload: payload as LLMResult });
    } else {
      const message =
        typeof (payload as { message?: string })?.message === 'string'
          ? (payload as { message: string }).message
          : 'unknown error';
      events.push({ type: 'ERROR', payload: { message } });
    }
  }

  return { events, rest };
}
