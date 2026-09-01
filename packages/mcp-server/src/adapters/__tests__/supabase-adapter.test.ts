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

  it('exportHighlights scopes to the requested domain when called with { scope: { domain } } (register-tools.ts shape)', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        {
          id: 'hl-1',
          url: 'https://example.com/page',
          text: 'Example highlight',
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'hl-2',
          url: 'https://other.com/page',
          text: 'Other highlight',
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

    const result = (await adapter.dispatch('export_highlights', {
      scope: { kind: 'domain', domain: 'example.com' },
    })) as { markdown: string; stats: { included: number; domains: number }; filename: string };

    expect(result.markdown).toContain('example.com');
    expect(result.markdown).not.toContain('other.com');
    expect(result.stats.included).toBe(1);
    expect(result.stats.domains).toBe(1);
    expect(result.filename).toBe('underscore-example.com.md');
  });

  it('exportHighlights also accepts a flat { domain } payload for backward compatibility', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        {
          id: 'hl-1',
          url: 'https://example.com/page',
          text: 'Example highlight',
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'hl-2',
          url: 'https://other.com/page',
          text: 'Other highlight',
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

    const result = (await adapter.dispatch('export_highlights', {
      domain: 'example.com',
    })) as { stats: { included: number } };

    expect(result.stats.included).toBe(1);
  });

  it('exportHighlights with kind: "library" (no domain) returns the full library', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        {
          id: 'hl-1',
          url: 'https://example.com/page',
          text: 'Example highlight',
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'hl-2',
          url: 'https://other.com/page',
          text: 'Other highlight',
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

    const result = (await adapter.dispatch('export_highlights', {
      scope: { kind: 'library' },
    })) as { stats: { included: number }; filename: string };

    expect(result.stats.included).toBe(2);
    expect(result.filename).toBe('underscore-library.md');
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

  it('get_recent_highlights sorts highlights descending and applies limit', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://a.com', text: 'Older', created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'hl-2', url: 'https://b.com', text: 'Newer', created_at: '2026-02-01T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('get_recent_highlights', { limit: 1 })) as {
      highlights: Array<{ id: string; text: string }>;
      total: number;
    };

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0].id).toBe('hl-2');
    expect(result.total).toBe(2);
  });

  it('get_page_highlights filters highlights matching the target page URL', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://example.com/docs/intro', text: 'Intro highlight', created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'hl-2', url: 'https://example.com/other', text: 'Other page', created_at: '2026-01-01T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('get_page_highlights', {
      url: 'https://example.com/docs/intro',
    })) as { highlights: Array<{ id: string }>; total: number };

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0].id).toBe('hl-1');
  });

  it('get_related_highlights scores relevance based on query terms', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://a.com', text: 'Distributed systems and consensus algorithms', created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'hl-2', url: 'https://b.com', text: 'Cooking pasta and making sauce', created_at: '2026-01-01T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('get_related_highlights', {
      query: 'distributed consensus',
    })) as { highlights: Array<{ id: string }>; total: number };

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0].id).toBe('hl-1');
  });

  it('list_tags returns unique tags with usage counts', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://a.com', text: 'H1', metadata: { tags: ['react', 'frontend'] }, created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'hl-2', url: 'https://b.com', text: 'H2', metadata: { tags: ['react', 'ai'] }, created_at: '2026-01-01T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('list_tags')) as {
      tags: Array<{ tag: string; count: number }>;
      totalTags: number;
    };

    expect(result.totalTags).toBe(3);
    expect(result.tags[0]).toEqual({ tag: 'react', count: 2 });
  });

  it('get_highlights_by_tag filters highlights containing the specified tag', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://a.com', text: 'H1', metadata: { tags: ['architecture'] }, created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'hl-2', url: 'https://b.com', text: 'H2', metadata: { tags: ['frontend'] }, created_at: '2026-01-01T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('get_highlights_by_tag', { tag: 'architecture' })) as {
      highlights: Array<{ id: string }>;
      total: number;
    };

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0].id).toBe('hl-1');
  });

  it('get_highlights_with_notes returns only highlights containing non-empty notes', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://a.com', text: 'Text 1', metadata: { notes: 'Important insight' }, created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'hl-2', url: 'https://b.com', text: 'Text 2', metadata: {}, created_at: '2026-01-02T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('get_highlights_with_notes')) as {
      highlights: Array<{ id: string; notes?: string }>;
      total: number;
    };

    expect(result.total).toBe(1);
    expect(result.highlights[0].id).toBe('hl-1');
    expect(result.highlights[0].notes).toBe('Important insight');
  });

  it('search_notes specifically queries within user notes', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://a.com', text: 'React hooks', metadata: { notes: 'Check dependency arrays' }, created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'hl-2', url: 'https://b.com', text: 'Dependency injection in Go', metadata: { notes: 'Clean architecture note' }, created_at: '2026-01-01T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('search_notes', { query: 'dependency arrays' })) as {
      highlights: Array<{ id: string }>;
      total: number;
    };

    expect(result.total).toBe(1);
    expect(result.highlights[0].id).toBe('hl-1');
  });

  it('get_highlight_note fetches note and metadata for single highlight', async () => {
    const chain = createHighlightsQueryChain('maybeSingle', {
      data: {
        id: 'hl-1',
        url: 'https://example.com/page',
        text: 'Hello world',
        metadata: { notes: 'My note', tags: ['cool'] },
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

    const result = (await adapter.dispatch('get_highlight_note', { id: 'hl-1' })) as {
      id: string;
      note: string;
      tags: string[];
    };

    expect(result.id).toBe('hl-1');
    expect(result.note).toBe('My note');
    expect(result.tags).toEqual(['cool']);
  });

  it('export_notes_digest formats highlights and notes as markdown digest', async () => {
    const chain = createHighlightsQueryChain('is', {
      data: [
        { id: 'hl-1', url: 'https://example.com/guide', text: 'Step 1', metadata: { notes: 'Do this first' }, created_at: '2026-01-01T00:00:00.000Z' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const adapter = new SupabaseMcpAdapter({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      accessToken: 'token',
    });

    const result = (await adapter.dispatch('export_notes_digest')) as {
      markdown: string;
      filename: string;
      stats: { notesCount: number };
    };

    expect(result.stats.notesCount).toBe(1);
    expect(result.markdown).toContain('Do this first');
    expect(result.filename).toBe('underscore-notes-digest.md');
  });
});
