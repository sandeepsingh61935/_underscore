import { describe, expect, it, vi } from 'vitest';

import { syncAiPreferences } from '@/shared/llm/ai-preferences-client';
import type { AiPreferences } from '@/shared/llm/ai-preferences';

type StoredRow = {
  user_id: string;
  default_provider: string | null;
  models: unknown;
  enabled_providers: unknown;
  updated_at: string;
};

function makeClient(opts: {
  remote: AiPreferences | null;
  onWrite?: (row: StoredRow) => void;
}) {
  const remoteRow: StoredRow | null = opts.remote
    ? {
        user_id: 'u1',
        default_provider: opts.remote.defaultProvider,
        models: opts.remote.models,
        enabled_providers: opts.remote.enabledProviders,
        updated_at: new Date(opts.remote.updatedAtMs).toISOString(),
      }
    : null;

  let stored: StoredRow | null = remoteRow;

  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn(() => chain);
  chain['eq'] = vi.fn(() => chain);
  chain['maybeSingle'] = vi.fn(async () => ({ data: stored, error: null }));
  const writeRow = (row: StoredRow) => {
    opts.onWrite?.(row);
    stored = {
      user_id: row.user_id,
      default_provider: row.default_provider,
      models: row.models,
      enabled_providers: row.enabled_providers,
      updated_at: row.updated_at,
    };
    return { error: null };
  };
  chain['insert'] = vi.fn(async (row: StoredRow) => writeRow(row));
  chain['upsert'] = vi.fn(async (row: StoredRow) => writeRow(row));
  chain['update'] = vi.fn(() => {
    const upd: Record<string, unknown> = {};
    upd['eq'] = vi.fn(() => upd);
    upd['lt'] = vi.fn(() => upd);
    upd['select'] = vi.fn(() => upd);
    upd['maybeSingle'] = vi.fn(async () => ({ data: stored, error: null }));
    return upd;
  });

  return {
    from: vi.fn(() => chain),
  };
}

describe('syncAiPreferences', () => {
  it('writes local when remote empty and local has content', async () => {
    const writes: StoredRow[] = [];
    const client = makeClient({
      remote: null,
      onWrite: (r) => writes.push(r),
    });

    const local: AiPreferences = {
      defaultProvider: 'openai',
      models: { openai: 'gpt-4o-mini' },
      enabledProviders: ['openai'],
      updatedAtMs: 1000,
    };

    const result = await syncAiPreferences(client as never, 'u1', local);
    expect(result.source).toBe('local');
    expect(result.wroteRemote).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.default_provider).toBe('openai');
  });

  it('adopts remote when remote is newer', async () => {
    const client = makeClient({
      remote: {
        defaultProvider: 'anthropic',
        models: { anthropic: 'claude-sonnet-4-6' },
        enabledProviders: [],
        updatedAtMs: 5000,
      },
    });

    const local: AiPreferences = {
      defaultProvider: 'openai',
      models: { openai: 'gpt-4o-mini' },
      enabledProviders: [],
      updatedAtMs: 1000,
    };

    const result = await syncAiPreferences(client as never, 'u1', local);
    expect(result.source).toBe('remote');
    expect(result.wroteRemote).toBe(false);
    expect(result.prefs.defaultProvider).toBe('anthropic');
  });

  it('returns empty when both empty', async () => {
    const client = makeClient({ remote: null });
    const result = await syncAiPreferences(client as never, 'u1', {
      defaultProvider: null,
      models: {},
      enabledProviders: [],
      updatedAtMs: 0,
    });
    expect(result.source).toBe('empty');
    expect(result.wroteRemote).toBe(false);
  });
});
