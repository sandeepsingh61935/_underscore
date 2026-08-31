/**
 * @file useUpdateHighlightText.ts
 * @description Persist curated highlight body text via background IPC (or web Supabase).
 */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { isExtensionContext } from '@/features/collections/hooks/useHighlightExport';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { UPDATE_HIGHLIGHT_TEXT } from '@/shared/schemas/message-schemas';
import { validateHighlightText } from '@/shared/utils/highlight-text';
import { serializeHighlightTextForCloud } from '@/shared/utils/supabase-highlight-row';

export type SendHighlightTextUpdate = (payload: {
  id: string;
  text: string;
}) => Promise<{ success: boolean; error?: string }>;

export async function executeUpdateHighlightText(
  id: string,
  text: string,
  sendUpdate: SendHighlightTextUpdate
): Promise<boolean> {
  const validated = validateHighlightText(text);
  if (!validated.ok) {
    toast.error(validated.error);
    return false;
  }

  const result = await sendUpdate({ id, text: validated.text });
  if (!result.success) {
    toast.error(result.error ?? 'Failed to save highlight text');
    return false;
  }
  toast.success('Saved');
  return true;
}

export async function updateHighlightTextWeb(
  id: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const validated = validateHighlightText(text);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  const { getWebSupabaseClient } = await import('@/shared/auth/supabase-web-client');
  const supabase = getWebSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('highlights')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    if (!existing) {
      return { success: false, error: `Highlight not found: ${id}` };
    }

    const { error } = await supabase
      .from('highlights')
      .update({
        text: serializeHighlightTextForCloud({ text: validated.text } as HighlightDataV2),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save highlight text',
    };
  }
}

export function useUpdateHighlightText(): {
  updateText: (id: string, text: string) => Promise<boolean>;
} {
  const sendAction = useIpcAction<{ id: string; text: string }, void>(
    UPDATE_HIGHLIGHT_TEXT
  );

  const updateText = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      if (!isExtensionContext()) {
        return executeUpdateHighlightText(id, text, (payload) =>
          updateHighlightTextWeb(payload.id, payload.text)
        );
      }
      return executeUpdateHighlightText(id, text, async (payload) => {
        const result = await sendAction(payload);
        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      });
    },
    [sendAction]
  );

  return { updateText };
}
