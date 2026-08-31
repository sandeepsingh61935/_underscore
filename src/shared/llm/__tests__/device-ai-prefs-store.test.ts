import { describe, expect, it, vi } from 'vitest';

import type { AiPreferences } from '@/shared/llm/ai-preferences';
import {
  reconcileAiPreferences,
  type DeviceAiPrefsStore,
} from '@/shared/llm/device-ai-prefs-store';

function prefs(partial: Partial<AiPreferences> & { updatedAtMs: number }): AiPreferences {
  return {
    defaultProvider: null,
    models: {},
    enabledProviders: [],
    ...partial,
  };
}

function mockDevice(
  initial: AiPreferences
): DeviceAiPrefsStore & { snap: AiPreferences } {
  const d = {
    snap: { ...initial, models: { ...initial.models } },
    read: vi.fn(async () => ({ ...d.snap, models: { ...d.snap.models } })),
    apply: vi.fn(async (p: AiPreferences) => {
      d.snap = { ...p, models: { ...p.models } };
    }),
    writeMeta: vi.fn(async (p: AiPreferences) => {
      d.snap = {
        ...d.snap,
        updatedAtMs: p.updatedAtMs,
        enabledProviders: [...p.enabledProviders],
      };
    }),
  };
  return d;
}

function mockSupabase(remote: AiPreferences | null) {
  let stored = remote
    ? {
        user_id: 'u1',
        default_provider: remote.defaultProvider,
        models: remote.models,
        enabled_providers: remote.enabledProviders,
        updated_at: new Date(remote.updatedAtMs).toISOString(),
      }
    : null;

  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn(() => chain);
  chain['eq'] = vi.fn(() => chain);
  chain['maybeSingle'] = vi.fn(async () => ({ data: stored, error: null }));
  chain['upsert'] = vi.fn(async (row: typeof stored) => {
    stored = row;
    return { error: null };
  });
  chain['update'] = vi.fn(() => {
    const upd: Record<string, unknown> = {};
    upd['eq'] = vi.fn(() => upd);
    upd['lt'] = vi.fn(() => upd);
    upd['select'] = vi.fn(() => upd);
    upd['maybeSingle'] = vi.fn(async () => ({ data: stored, error: null }));
    return upd;
  });

  return { from: vi.fn(() => chain) };
}

describe('reconcileAiPreferences', () => {
  it('applies remote when remote is newer', async () => {
    const remote = prefs({
      defaultProvider: 'anthropic',
      models: { anthropic: 'claude' },
      updatedAtMs: 5000,
    });
    const device = mockDevice(
      prefs({ defaultProvider: 'openai', models: { openai: 'gpt' }, updatedAtMs: 100 })
    );
    const result = await reconcileAiPreferences(
      mockSupabase(remote) as never,
      'u1',
      device
    );
    expect(result.source).toBe('remote');
    expect(device.apply).toHaveBeenCalledTimes(1);
    expect(device.writeMeta).not.toHaveBeenCalled();
    expect(device.snap.defaultProvider).toBe('anthropic');
  });

  it('writeMeta when local wins and writes remote', async () => {
    const device = mockDevice(
      prefs({
        defaultProvider: 'openai',
        models: { openai: 'gpt-4o-mini' },
        updatedAtMs: 9000,
      })
    );
    const result = await reconcileAiPreferences(
      mockSupabase(null) as never,
      'u1',
      device
    );
    expect(result.source).toBe('local');
    expect(result.wroteRemote).toBe(true);
    expect(device.apply).not.toHaveBeenCalled();
    expect(device.writeMeta).toHaveBeenCalled();
  });

  it('bumpClock touches before sync', async () => {
    const device = mockDevice(
      prefs({
        defaultProvider: 'openai',
        models: { openai: 'gpt' },
        updatedAtMs: 10,
      })
    );
    await reconcileAiPreferences(mockSupabase(null) as never, 'u1', device, {
      bumpClock: true,
    });
    expect(device.writeMeta).toHaveBeenCalled();
    const firstMeta = (device.writeMeta as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as AiPreferences;
    expect(firstMeta.updatedAtMs).toBeGreaterThan(10);
  });
});
