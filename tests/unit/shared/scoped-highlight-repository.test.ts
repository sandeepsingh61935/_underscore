import { describe, expect, it } from 'vitest';

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';

function makeHighlight(id: string): HighlightDataV2 {
  return {
    id,
    text: `text-${id}`,
    contentHash: id.padEnd(64, 'a'),
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
    url: 'https://example.com',
  };
}

describe('ScopedHighlightRepository', () => {
  it('routes writes to basic store when basic scope is active', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro);

    await scoped.add(makeHighlight('basic-1'));

    expect(await basic.count()).toBe(1);
    expect(await pro.count()).toBe(0);
    expect(scoped.getActiveScope()).toBe('basic');
  });

  it('routes writes to pro store when pro scope is active', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro);

    await scoped.activateScope('pro');
    await scoped.add(makeHighlight('pro-1'));

    expect(await pro.count()).toBe(1);
    expect(await basic.count()).toBe(0);
  });

  it('wipeProLocal clears pro store but preserves basic store', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro);

    await basic.add(makeHighlight('basic-1'));
    await pro.add(makeHighlight('pro-1'));

    await scoped.wipeProLocal();

    expect(await pro.count()).toBe(0);
    expect(await basic.count()).toBe(1);
  });

  it('findAll returns only active scope highlights', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro);

    await basic.add(makeHighlight('basic-1'));
    await pro.add(makeHighlight('pro-1'));

    expect(await scoped.findAll()).toHaveLength(1);
    expect((await scoped.findAll())[0]?.id).toBe('basic-1');

    await scoped.activateScope('pro');
    expect(await scoped.findAll()).toHaveLength(1);
    expect((await scoped.findAll())[0]?.id).toBe('pro-1');
  });
});
