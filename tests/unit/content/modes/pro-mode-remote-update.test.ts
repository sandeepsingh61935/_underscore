/**
 * Regression: remote highlight events must not re-enter DualWrite/cloud.
 *
 * Root cause of infinite DualWrite ↔ realtime loop when editing highlight text
 * (e.g. code fences): ProMode.facade.update → IPC → DualWrite cloud always
 * bumps updated_at → realtime UPDATE → content again.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ProMode } from '@/content/modes/pro-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { SupabaseHighlightRow } from '@/shared/utils/supabase-highlight-row';

function makeLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
  } as unknown as ILogger;
}

function makeSupabaseRow(over: Partial<SupabaseHighlightRow> = {}): SupabaseHighlightRow {
  return {
    id: '438df260-ddaa-47c1-9d3b-025ba5e96296',
    user_id: 'user-1',
    url: 'https://example.com/docs',
    text: '```\nint a = 1;\n```',
    color_role: 'yellow',
    content_hash: 'b'.repeat(64),
    selectors: null,
    metadata: null,
    created_at: '2026-07-20T08:00:00.000Z',
    updated_at: '2026-07-20T08:11:42.000Z',
    deleted_at: null,
    ...over,
  };
}

describe('ProMode remote highlight handlers (no cloud re-entry)', () => {
  let facade: RepositoryFacade;
  let mode: ProMode;
  let updateSpy: ReturnType<typeof vi.spyOn>;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let rehydrateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    const repo = new InMemoryHighlightRepository();
    facade = new RepositoryFacade(repo);
    await facade.initialize();

    updateSpy = vi.spyOn(facade, 'update');
    addSpy = vi.spyOn(facade, 'add');
    rehydrateSpy = vi.spyOn(facade, 'rehydrate');

    const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
    mode = new ProMode(facade, eventBus, makeLogger());
  });

  it('remote UPDATE rehydrates cache only — never facade.update (IPC/cloud loop)', async () => {
    const row = makeSupabaseRow();

    // Seed session so update path has local state
    facade.rehydrate({
      id: row.id!,
      text: 'plain before fence',
      contentHash: 'a'.repeat(64),
      colorRole: 'yellow',
      type: 'underscore',
      ranges: [],
      createdAt: new Date(row.created_at!),
      url: row.url!,
    });
    rehydrateSpy.mockClear();

    await (
      mode as unknown as {
        handleRemoteHighlightUpdated: (data: unknown) => Promise<void>;
      }
    ).handleRemoteHighlightUpdated(row);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalled();
    expect(rehydrateSpy).toHaveBeenCalledTimes(1);

    const cached = facade.get(row.id!);
    expect(cached?.text).toBe('```\nint a = 1;\n```');
    expect(cached?.colorRole).toBe('yellow');
  });

  it('remote CREATE rehydrates cache only — never facade.add (IPC/cloud loop)', async () => {
    const row = makeSupabaseRow({ id: 'new-remote-id' });

    // Avoid restore path network/DOM — stub restoreHighlight

    (mode as any).cloudService.restoreHighlight = vi
      .fn()
      .mockResolvedValue({ range: null });

    await (
      mode as unknown as {
        handleRemoteHighlightCreated: (data: unknown) => Promise<void>;
      }
    ).handleRemoteHighlightCreated(row);

    expect(addSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(rehydrateSpy).toHaveBeenCalled();
    expect(facade.get('new-remote-id')?.text).toContain('int a = 1');
  });

  it('ignores invalid remote payloads without writing', async () => {
    await (
      mode as unknown as {
        handleRemoteHighlightUpdated: (data: unknown) => Promise<void>;
      }
    ).handleRemoteHighlightUpdated({ notAnId: true });

    expect(updateSpy).not.toHaveBeenCalled();
    expect(rehydrateSpy).not.toHaveBeenCalled();
  });
});
