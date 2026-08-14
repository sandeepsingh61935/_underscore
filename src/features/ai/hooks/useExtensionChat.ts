/**
 * Extension popup chat session (ADR-028) — same stack as web, chrome.storage session.
 */

import { useCallback } from 'react';

import { useChatSession } from '@/features/ai/hooks/useChatSession';
import { getExtensionSupabaseClient } from '@/shared/auth/supabase-extension-client';

export function useExtensionChat(opts: {
  userId: string | null | undefined;
  enabled: boolean;
}): ReturnType<typeof useChatSession> {
  const getSupabase = useCallback(() => getExtensionSupabaseClient(), []);
  return useChatSession({
    userId: opts.userId,
    enabled: opts.enabled,
    getSupabase,
  });
}
