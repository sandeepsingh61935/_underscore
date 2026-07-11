/**
 * @file useUpdateHighlightMetadata.ts
 * @description Persist user notes and tags on a highlight via background IPC.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { isExtensionContext } from '@/features/collections/hooks/useHighlightExport';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { UPDATE_HIGHLIGHT_METADATA } from '@/shared/schemas/message-schemas';
import { buildHighlightMetadataUpdate } from '@/shared/utils/highlight-metadata';
import { serializeHighlightMetadataForCloud } from '@/shared/utils/supabase-highlight-row';

export interface HighlightMetadataInput {
  notes?: string;
  tags?: string[];
}

export type SendHighlightMetadataUpdate = (
  payload: { id: string } & HighlightMetadataInput,
) => Promise<{ success: boolean; error?: string }>;

export async function executeUpdateHighlightMetadata(
  id: string,
  input: HighlightMetadataInput,
  sendUpdate: SendHighlightMetadataUpdate,
): Promise<boolean> {
  const result = await sendUpdate({ id, ...input });
  if (!result.success) {
    toast.error(result.error ?? 'Failed to save highlight metadata');
    return false;
  }
  toast.success('Saved');
  return true;
}

export async function updateHighlightMetadataWeb(
  id: string,
  input: HighlightMetadataInput,
): Promise<{ success: boolean; error?: string }> {
  const { getWebSupabaseClient } = await import('@/shared/auth/supabase-web-client');
  const supabase = getWebSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const metadata = buildHighlightMetadataUpdate(input);
  const { error } = await supabase
    .from('highlights')
    .update({
      metadata: serializeHighlightMetadataForCloud(metadata),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export function useUpdateHighlightMetadata(): {
  updateMetadata: (id: string, input: HighlightMetadataInput) => Promise<boolean>;
} {
  const sendAction = useIpcAction<
    { id: string; notes?: string; tags?: string[] },
    void
  >(UPDATE_HIGHLIGHT_METADATA);

  const updateMetadata = useCallback(
    async (id: string, input: HighlightMetadataInput): Promise<boolean> => {
      if (!isExtensionContext()) {
        return executeUpdateHighlightMetadata(id, input, (payload) => updateHighlightMetadataWeb(payload.id, payload));
      }
      return executeUpdateHighlightMetadata(id, input, async (payload) => {
        const result = await sendAction(payload);
        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      });
    },
    [sendAction],
  );

  return { updateMetadata };
}
