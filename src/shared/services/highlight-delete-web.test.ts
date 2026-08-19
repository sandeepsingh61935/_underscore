import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
const updateEq = vi.fn();
const updateIn = vi.fn();
const updateIs = vi.fn();
const update = vi.fn(() => ({
  eq: updateEq,
}));

vi.mock('@/shared/auth/supabase-web-client', () => ({
  getWebSupabaseClient: () => ({
    auth: { getSession },
    from: () => ({ update }),
  }),
}));

import { softDeleteHighlightsWeb } from './highlight-delete-web';

describe('softDeleteHighlightsWeb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEq.mockImplementation(() => ({
      in: updateIn,
    }));
    updateIn.mockImplementation(() => ({
      is: updateIs,
    }));
    updateIs.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
  });

  it('returns success with empty ids without calling supabase', async () => {
    const r = await softDeleteHighlightsWeb([]);
    expect(r).toEqual({ success: true, deletedCount: 0, removedIds: [] });
    expect(update).not.toHaveBeenCalled();
  });

  it('soft-deletes ids for the session user', async () => {
    const r = await softDeleteHighlightsWeb(['a', 'b', 'a']);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.deletedCount).toBe(2);
      expect(r.removedIds).toEqual(['a', 'b']);
    }
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(updateEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(updateIn).toHaveBeenCalledWith('id', ['a', 'b']);
    expect(updateIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('fails when not signed in', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const r = await softDeleteHighlightsWeb(['a']);
    expect(r).toEqual({ success: false, error: 'Not signed in' });
  });

  it('surfaces PostgREST errors', async () => {
    updateIs.mockResolvedValue({ error: { message: 'RLS blocked' } });
    const r = await softDeleteHighlightsWeb(['a']);
    expect(r).toEqual({ success: false, error: 'RLS blocked' });
  });
});
