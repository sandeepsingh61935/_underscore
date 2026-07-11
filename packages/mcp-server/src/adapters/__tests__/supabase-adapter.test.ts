import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HIGHLIGHTS_SELECT_COLUMNS } from '../cloud-highlight-text.js';
import { SupabaseMcpAdapter } from '../supabase-adapter.js';

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

function createHighlightsQueryChain(
  terminal: 'is' | 'maybeSingle',
  result: { data: unknown; error: { code?: string; message: string } | null },
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  if (terminal === 'is') {
    chain.is.mockResolvedValue(result);
  } else {
    chain.is.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValue(result);
  }

  return chain;
}

describe('SupabaseMcpAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.c' } }, error: null });
  });

  it('fetchHighlights uses HIGHLIGHTS_SELECT_COLUMNS in .select()', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        {
          id: 'hl-1',
          url: 'https://example.com/page',
          text: 'Hello',
          metadata: { notes: 'note', tags: ['tag'] },
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    await adapter.dispatch('list_collections');

    expect(mockFrom).toHaveBeenCalledWith('highlights');
    expect(chain.select).toHaveBeenCalledWith(HIGHLIGHTS_SELECT_COLUMNS);
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('fetchHighlight uses HIGHLIGHTS_SELECT_COLUMNS in .select()', async () => {
    const chain = createHighlightsQueryChain('maybeSingle', {
      data: {
        id: 'hl-1',
        url: 'https://example.com/page',
        text: 'Hello',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    await adapter.dispatch('fetch_highlight', { id: 'hl-1' });

    expect(chain.select).toHaveBeenCalledWith(HIGHLIGHTS_SELECT_COLUMNS);
    expect(chain.eq).toHaveBeenCalledWith('id', 'hl-1');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
    expect(chain.maybeSingle).toHaveBeenCalled();
  });

  it('throws SUPABASE_ERROR with PostgREST message when column does not exist', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: null,
      error: { code: '42703', message: 'column highlights.foo does not exist' },
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    await expect(adapter.dispatch('list_collections')).rejects.toMatchObject({
      code: 'SUPABASE_ERROR',
      message: 'column highlights.foo does not exist',
    });
  });

  it('throws SUPABASE_ERROR on fetchHighlight PostgREST column errors', async () => {
    const chain = createHighlightsQueryChain('maybeSingle', {
      data: null,
      error: { code: '42703', message: 'column highlights.metadata does not exist' },
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    await expect(adapter.dispatch('fetch_highlight', { id: 'hl-1' })).rejects.toMatchObject({
      code: 'SUPABASE_ERROR',
      message: 'column highlights.metadata does not exist',
    });
  });
});
