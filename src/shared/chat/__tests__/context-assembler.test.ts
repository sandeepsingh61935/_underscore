import { describe, expect, it } from 'vitest';

import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';

import { assembleChatRequest, selectContextMessages } from '../context-assembler';
import type { ChatMessage } from '../types';

function msg(
  partial: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'role' | 'content' | 'status'>,
): ChatMessage {
  return {
    threadId: 't1',
    userId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const excerpts: HighlightExcerpt[] = [
  {
    id: 'h1',
    url: 'https://example.com',
    highlightText: 'Important highlight',
    pageTitle: 'Example',
    excerpt: '…Important highlight…',
  },
];

const scope = {
  scopeLabel: 'Library',
  scopeKind: 'domain' as const,
  highlightCount: 1,
};

describe('selectContextMessages', () => {
  it('keeps only completed messages and windows to K pairs', () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 12; i++) {
      history.push(
        msg({ id: `u${i}`, role: 'user', content: `q${i}`, status: 'completed' }),
        msg({ id: `a${i}`, role: 'assistant', content: `a${i}`, status: 'completed' }),
      );
    }
    history.push(
      msg({ id: 'stream', role: 'assistant', content: 'partial', status: 'streaming' }),
    );

    const selected = selectContextMessages(history, 10);
    expect(selected).toHaveLength(20);
    expect(selected[0]?.content).toBe('q2');
    expect(selected[selected.length - 1]?.content).toBe('a11');
    expect(selected.some((m) => m.content === 'partial')).toBe(false);
  });

  it('drops incomplete pairs and empty assistant shells', () => {
    const selected = selectContextMessages([
      msg({ id: 'u1', role: 'user', content: 'hi', status: 'completed' }),
      msg({ id: 'a1', role: 'assistant', content: '', status: 'completed' }),
      msg({ id: 'u2', role: 'user', content: 'orphan', status: 'completed' }),
    ]);
    expect(selected).toEqual([]);
  });
});

describe('assembleChatRequest', () => {
  it('puts live excerpts on the latest user turn and keeps prior turns plain', () => {
    const history = [
      msg({ id: 'u1', role: 'user', content: 'first', status: 'completed' }),
      msg({ id: 'a1', role: 'assistant', content: 'answer', status: 'completed' }),
    ];

    const req = assembleChatRequest({
      scope,
      excerpts,
      history,
      question: 'follow up?',
    });

    expect(req.systemPrompt).toMatch(/highlights/i);
    expect(req.messages).toHaveLength(3);
    expect(req.messages[0]).toEqual({ role: 'user', content: 'first' });
    expect(req.messages[1]).toEqual({ role: 'assistant', content: 'answer' });
    expect(req.messages[2]?.role).toBe('user');
    expect(req.messages[2]?.content).toContain('Important highlight');
    expect(req.messages[2]?.content).toContain('follow up?');
  });

  it('does not duplicate the user message when history already ends with it', () => {
    const history = [
      msg({ id: 'u1', role: 'user', content: 'same', status: 'completed' }),
    ];
    const req = assembleChatRequest({
      scope,
      excerpts,
      history,
      question: 'same',
    });
    expect(req.messages).toHaveLength(1);
    expect(req.messages[0]?.role).toBe('user');
    expect(req.messages[0]?.content).toContain('same');
    expect(req.messages[0]?.content).toContain('Important highlight');
  });

  it('rejects empty questions', () => {
    expect(() =>
      assembleChatRequest({ scope, excerpts, history: [], question: '  ' }),
    ).toThrow(/non-empty/);
  });
});
