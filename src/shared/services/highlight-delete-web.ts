/**
 * @file highlight-delete-web.ts
 * @description Soft-delete highlights via Supabase from the web app (no extension IPC).
 */

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';

export type WebDeleteSuccess = {
  success: true;
  deletedCount: number;
  removedIds: string[];
};

export type WebDeleteFailure = {
  success: false;
  error: string;
};

export type WebDeleteResult = WebDeleteSuccess | WebDeleteFailure;

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

/**
 * Soft-delete one or more highlight rows owned by the current session user.
 * Sets `deleted_at`; does not hard-delete.
 */
export async function softDeleteHighlightsWeb(
  ids: readonly string[]
): Promise<WebDeleteResult> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { success: true, deletedCount: 0, removedIds: [] };
  }

  try {
    const supabase = getWebSupabaseClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return { success: false, error: toErrorMessage(sessionError, 'Not signed in') };
    }
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, error: 'Not signed in' };
    }

    const deletedAt = new Date().toISOString();
    // Chunk to keep PostgREST URL / payload reasonable.
    const CHUNK = 80;
    for (let i = 0; i < unique.length; i += CHUNK) {
      const slice = unique.slice(i, i + CHUNK);
      const { error } = await supabase
        .from('highlights')
        .update({ deleted_at: deletedAt })
        .eq('user_id', userId)
        .in('id', slice)
        .is('deleted_at', null);

      if (error) {
        return { success: false, error: toErrorMessage(error, 'Failed to delete') };
      }
    }

    return {
      success: true,
      deletedCount: unique.length,
      removedIds: unique,
    };
  } catch (err) {
    return { success: false, error: toErrorMessage(err, 'Failed to delete') };
  }
}
