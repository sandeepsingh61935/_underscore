/**
 * @file useUpdateHighlightMetadata.ts
 * @description Persist notes, tags, and presentation on a highlight via background IPC.
 * Presentation never rewrites quote text.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { isExtensionContext } from '@/features/collections/hooks/useHighlightExport';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { UPDATE_HIGHLIGHT_METADATA } from '@/shared/schemas/message-schemas';
import {
  mergeHighlightMetadataPatch,
  type HighlightMetadataInput,
} from '@/shared/utils/highlight-metadata';
import { serializeHighlightMetadataForCloud } from '@/shared/utils/supabase-highlight-row';
import { setHighlightLabelsWeb } from '@/shared/services/tag-query-web';

export type { HighlightMetadataInput };

export type SendHighlightMetadataUpdate = (
  payload: { id: string } & HighlightMetadataInput,
) => Promise<{ success: boolean; error?: string }>;

export interface UpdateHighlightMetadataOptions {
  /** When true, suppress success toast (MarginaliaStrip uses error-only feedback). */
  silent?: boolean;
}

export async function executeUpdateHighlightMetadata(
  id: string,
  input: HighlightMetadataInput,
  sendUpdate: SendHighlightMetadataUpdate,
  options?: UpdateHighlightMetadataOptions,
): Promise<boolean> {
  const result = await sendUpdate({ id, ...input });
  if (!result.success) {
    toast.error(result.error ?? 'Failed to save highlight metadata');
    return false;
  }
  if (!options?.silent) {
    toast.success('Saved');
  }
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

  try {
    if (
      input.notes === undefined &&
      input.tags === undefined &&
      input.presentation === undefined
    ) {
      return { success: false, error: 'No notes, tags, or presentation to update' };
    }

    const { data: existing, error: fetchError } = await supabase
      .from('highlights')
      .select('metadata')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    if (!existing) {
      return { success: false, error: `Highlight not found: ${id}` };
    }

    const metadata = mergeHighlightMetadataPatch(
      existing.metadata as Parameters<typeof mergeHighlightMetadataPatch>[0],
      input,
    );

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

    if (input.tags !== undefined) {
      try {
        await setHighlightLabelsWeb(supabase, session.user.id, id, input.tags);
      } catch (junctionError) {
        // Metadata.tags already persisted — surface junction failure so the UI
        // does not claim success when labels may not list via junction reads.
        return {
          success: false,
          error:
            junctionError instanceof Error
              ? junctionError.message
              : 'Failed to save tags',
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save highlight metadata',
    };
  }
}

export function useUpdateHighlightMetadata(): {
  updateMetadata: (
    id: string,
    input: HighlightMetadataInput,
    options?: UpdateHighlightMetadataOptions,
  ) => Promise<boolean>;
} {
  const sendAction = useIpcAction<
    {
      id: string;
      notes?: string;
      tags?: string[];
      presentation?: HighlightMetadataInput['presentation'];
    },
    void
  >(UPDATE_HIGHLIGHT_METADATA);

  const updateMetadata = useCallback(
    async (
      id: string,
      input: HighlightMetadataInput,
      options?: UpdateHighlightMetadataOptions,
    ): Promise<boolean> => {
      if (!isExtensionContext()) {
        return executeUpdateHighlightMetadata(
          id,
          input,
          (payload) => updateHighlightMetadataWeb(payload.id, payload),
          options,
        );
      }
      return executeUpdateHighlightMetadata(
        id,
        input,
        async (payload) => {
          const result = await sendAction(payload);
          return result.success
            ? { success: true }
            : { success: false, error: result.error };
        },
        options,
      );
    },
    [sendAction],
  );

  return { updateMetadata };
}
