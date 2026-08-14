/**
 * Web chat session state: threads list + active transcript (ADR-028).
 * Turn orchestration lives in useGroundedChatTurn / runGroundedTurn.
 */

import { useCallback } from 'react';

import { useChatSession } from '@/features/ai/hooks/useChatSession';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';

export type { ChatSessionStatus as WebChatStatus } from '@/features/ai/hooks/useChatSession';

export function useWebChat(opts: {
  userId: string | null | undefined;
  enabled: boolean;
}): ReturnType<typeof useChatSession> {
  const getSupabase = useCallback(() => getWebSupabaseClient(), []);
  return useChatSession({
    userId: opts.userId,
    enabled: opts.enabled,
    getSupabase,
  });
}
