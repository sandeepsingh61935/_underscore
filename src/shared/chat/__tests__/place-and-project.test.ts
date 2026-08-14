import { describe, expect, it } from 'vitest';

import { ChatService } from '../chat-service';
import { highlightsForPlace } from '../highlights-for-place';
import { MemoryChatRepository } from '../memory-chat-repository';
import { MemoryProjectRepository } from '../memory-project-repository';
import { placeToScope, scopeToPlace } from '../place';
import { ProjectService } from '../project-service';

describe('place mapping', () => {
  it('round-trips domain and section places', () => {
    const d = placeToScope({ type: 'domain', domain: 'a.com' });
    expect(scopeToPlace(d)).toEqual({ type: 'domain', domain: 'a.com' });
    const s = placeToScope({
      type: 'section',
      domain: 'a.com',
      sectionKey: '/docs',
    });
    expect(scopeToPlace(s)).toEqual({
      type: 'section',
      domain: 'a.com',
      sectionKey: '/docs',
    });
  });

  it('library is not a place', () => {
    expect(scopeToPlace({ kind: 'library' })).toBeNull();
  });
});

describe('highlightsForPlace', () => {
  const highlights = [
    { id: '1', domain: 'a.com', path: '/x', text: 'a' },
    { id: '2', domain: 'a.com', path: '/y', text: 'b' },
    { id: '3', domain: 'b.com', path: '/', text: 'c' },
  ];

  it('filters domain and section', () => {
    expect(
      highlightsForPlace(highlights, { type: 'domain', domain: 'a.com' }),
    ).toHaveLength(2);
    expect(
      highlightsForPlace(highlights, {
        type: 'section',
        domain: 'a.com',
        sectionKey: '/x',
      }),
    ).toEqual([highlights[0]]);
  });

  it('unions project members with dedupe', () => {
    const out = highlightsForPlace(
      highlights,
      { type: 'project', projectId: 'p1' },
      [
        { kind: 'domain', domain: 'a.com' },
        { kind: 'section', domain: 'b.com', sectionKey: '/' },
      ],
    );
    expect(out.map((h) => h.id).sort()).toEqual(['1', '2', '3']);
  });
});

describe('resolvePlaceChat singleton', () => {
  it('returns the same thread for the same domain place', async () => {
    const chat = new ChatService(new MemoryChatRepository());
    const a = await chat.resolvePlaceChat('u1', {
      type: 'domain',
      domain: 'example.com',
    });
    const b = await chat.resolvePlaceChat('u1', {
      type: 'domain',
      domain: 'example.com',
    });
    expect(a.id).toBe(b.id);
    const threads = await chat.listThreads('u1');
    expect(threads.filter((t) => t.scope.kind === 'domain')).toHaveLength(1);
  });

  it('clearConversation empties messages but keeps thread', async () => {
    const chat = new ChatService(new MemoryChatRepository());
    const thread = await chat.resolvePlaceChat('u1', {
      type: 'domain',
      domain: 'x.com',
    });
    await chat.beginTurn({
      userId: 'u1',
      threadId: thread.id,
      scope: thread.scope,
      question: 'hi',
    });
    let msgs = await chat.listMessages('u1', thread.id);
    expect(msgs.length).toBeGreaterThan(0);
    await chat.clearConversation('u1', thread.id);
    msgs = await chat.listMessages('u1', thread.id);
    expect(msgs).toHaveLength(0);
    const again = await chat.resolvePlaceChat('u1', {
      type: 'domain',
      domain: 'x.com',
    });
    expect(again.id).toBe(thread.id);
  });
});

describe('ProjectService', () => {
  it('creates project and opens singleton project chat', async () => {
    const chat = new ChatService(new MemoryChatRepository());
    const projects = new ProjectService(new MemoryProjectRepository(), chat);
    const p = await projects.createUntitledFromMembers('u1', [
      { kind: 'domain', domain: 'a.com' },
      { kind: 'domain', domain: 'b.com' },
    ]);
    expect(p.title).toBe('Untitled project');
    expect(p.members).toHaveLength(2);

    const t1 = await projects.openProjectChat('u1', p);
    const t2 = await projects.openProjectChat('u1', p);
    expect(t1.id).toBe(t2.id);
    expect(t1.scope).toEqual({ kind: 'project', projectId: p.id });
  });
});
