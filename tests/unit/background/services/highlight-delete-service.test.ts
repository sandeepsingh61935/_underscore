import { describe, expect, it, vi } from 'vitest';

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import {
  HighlightDeleteService,
  type HighlightCloudDeletePort,
  type HighlightDeleteContext,
} from '@/background/services/highlight-delete-service';

const HIGHLIGHT_ID = '11111111-1111-4111-8111-111111111111';

function makeHighlight(
  id: string,
  url = 'https://example.com/docs/page'
): HighlightDataV2 {
  return {
    id,
    text: `text-${id}`,
    contentHash: id.replace(/-/g, '').padEnd(64, 'a'),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/p',
        startOffset: 0,
        endOffset: 4,
        text: 'text',
        textBefore: '',
        textAfter: '',
      },
    ],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-02'),
    url,
  };
}

function makeCloudPort(): HighlightCloudDeletePort {
  return {
    deleteHighlight: vi.fn().mockResolvedValue(undefined),
    restoreHighlight: vi.fn().mockResolvedValue(undefined),
    softDeleteAllHighlights: vi.fn().mockResolvedValue(undefined),
  };
}

function guestContext(): HighlightDeleteContext {
  return { isAuthenticated: false };
}

function proContext(): HighlightDeleteContext {
  return { isAuthenticated: true };
}

async function makeService(
  highlights: HighlightDataV2[] = [],
  initialScope: 'basic' | 'pro' = 'basic'
) {
  const basic = new InMemoryHighlightRepository();
  const pro = new InMemoryHighlightRepository();
  const scoped = new ScopedHighlightRepository(basic, pro, initialScope);
  const facade = new RepositoryFacade(scoped);
  await facade.initialize();
  for (const h of highlights) {
    facade.add(h);
  }
  await facade.reload();
  const cloud = makeCloudPort();
  const service = new HighlightDeleteService(facade, cloud);
  return { service, basic, pro, scoped, facade, cloud };
}

describe('HighlightDeleteService.executeDelete', () => {
  it('removes one highlight from the basic store when a guest deletes a highlight', async () => {
    const { service, basic, cloud } = await makeService([makeHighlight(HIGHLIGHT_ID)]);

    const result = await service.executeDelete(
      { scope: 'highlight', id: HIGHLIGHT_ID },
      guestContext()
    );

    expect(result).toEqual({
      success: true,
      deletedCount: 1,
      removedIds: [HIGHLIGHT_ID],
    });
    expect(await basic.count()).toBe(0);
    expect(cloud.deleteHighlight).not.toHaveBeenCalled();
  });

  it('soft-deletes in cloud when a signed-in user deletes a highlight', async () => {
    const { service, pro, cloud } = await makeService(
      [makeHighlight(HIGHLIGHT_ID)],
      'pro'
    );

    const result = await service.executeDelete(
      { scope: 'highlight', id: HIGHLIGHT_ID },
      proContext()
    );

    expect(result).toEqual({
      success: true,
      deletedCount: 1,
      removedIds: [HIGHLIGHT_ID],
    });
    expect(await pro.count()).toBe(0);
    expect(cloud.deleteHighlight).toHaveBeenCalledWith(HIGHLIGHT_ID);
  });
});

describe('HighlightDeleteService.undoPendingHighlight', () => {
  it('restores the last deleted highlight within the undo window', async () => {
    const { service, pro, cloud } = await makeService(
      [makeHighlight(HIGHLIGHT_ID)],
      'pro'
    );

    await service.executeDelete({ scope: 'highlight', id: HIGHLIGHT_ID }, proContext());
    const undo = await service.undoPendingHighlight(proContext());

    expect(undo).toEqual({ success: true, deletedCount: 0, restoredIds: [HIGHLIGHT_ID] });
    expect(await pro.count()).toBe(1);
    expect(cloud.restoreHighlight).toHaveBeenCalledWith(HIGHLIGHT_ID);
  });

  it('returns not found after the undo window expires', async () => {
    vi.useFakeTimers();
    const { service } = await makeService([makeHighlight(HIGHLIGHT_ID)], 'pro');

    await service.executeDelete({ scope: 'highlight', id: HIGHLIGHT_ID }, proContext());
    vi.advanceTimersByTime(5001);

    const undo = await service.undoPendingHighlight(proContext());

    expect(undo).toEqual({ success: false, code: 'NOT_FOUND', error: 'Nothing to undo' });
    vi.useRealTimers();
  });
});

describe('HighlightDeleteService bulk delete', () => {
  it('deletes all highlights on a domain across sections', async () => {
    const highlights = [
      makeHighlight('11111111-1111-4111-8111-111111111111', 'https://example.com/a'),
      makeHighlight('22222222-2222-4222-8222-222222222222', 'https://example.com/b'),
      makeHighlight('33333333-3333-4333-8333-333333333333', 'https://other.com/x'),
    ];
    const { service, basic } = await makeService(highlights);

    const result = await service.executeDelete(
      { scope: 'domain', domain: 'example.com' },
      guestContext()
    );

    expect(result).toEqual({
      success: true,
      deletedCount: 2,
      removedIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
    });
    expect(await basic.count()).toBe(1);
  });

  it('deletes only highlights in the requested section', async () => {
    const highlights = [
      makeHighlight(
        '11111111-1111-4111-8111-111111111111',
        'https://example.com/docs/page1'
      ),
      makeHighlight(
        '22222222-2222-4222-8222-222222222222',
        'https://example.com/docs/page1'
      ),
      makeHighlight(
        '33333333-3333-4333-8333-333333333333',
        'https://example.com/blog/post'
      ),
    ];
    const { service, basic } = await makeService(highlights);

    const result = await service.executeDelete(
      { scope: 'section', domain: 'example.com', sectionKey: '/docs/page1' },
      guestContext()
    );

    expect(result).toEqual({
      success: true,
      deletedCount: 2,
      removedIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
    });
    expect(await basic.count()).toBe(1);
  });

  it('wipes only the active basic library for guests', async () => {
    const { service, basic, pro } = await makeService([
      makeHighlight('11111111-1111-4111-8111-111111111111'),
      makeHighlight('22222222-2222-4222-8222-222222222222'),
    ]);
    await pro.add(makeHighlight('33333333-3333-4333-8333-333333333333'));

    const result = await service.executeDelete({ scope: 'library' }, guestContext());

    expect(result).toEqual({
      success: true,
      deletedCount: 2,
      removedIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
    });
    expect(await basic.count()).toBe(0);
    expect(await pro.count()).toBe(1);
  });

  it('soft-deletes all cloud highlights when a signed-in user wipes the library', async () => {
    const { service, pro, cloud } = await makeService(
      [
        makeHighlight('11111111-1111-4111-8111-111111111111'),
        makeHighlight('22222222-2222-4222-8222-222222222222'),
      ],
      'pro'
    );

    const result = await service.executeDelete({ scope: 'library' }, proContext());

    expect(result).toEqual({
      success: true,
      deletedCount: 2,
      removedIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
    });
    expect(await pro.count()).toBe(0);
    expect(cloud.softDeleteAllHighlights).toHaveBeenCalledOnce();
    expect(cloud.deleteHighlight).not.toHaveBeenCalled();
  });
});
