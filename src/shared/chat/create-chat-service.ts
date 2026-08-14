/**
 * Construct ChatService + cache stack (ADR-028).
 * Surfaces inject a platform Supabase client; no React here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { CachedChatRepository } from './cached-chat-repository';
import { ChatService } from './chat-service';
import {
  IndexedDbChatCache,
  MemoryChatCache,
  type IChatCache,
} from './indexeddb-chat-cache';
import { SupabaseChatRepository } from './supabase-chat-repository';

/** Prefer IndexedDB when available; otherwise in-memory. */
export function createChatCache(): IChatCache {
  try {
    if (typeof indexedDB !== 'undefined') {
      return new IndexedDbChatCache();
    }
  } catch {
    /* fall through */
  }
  return new MemoryChatCache();
}

/**
 * Wire Supabase SoT + local cache into ChatService.
 * Callers own client lifetime (web SPA vs extension storage adapter).
 */
export function createChatService(
  supabase: SupabaseClient,
  cache: IChatCache = createChatCache(),
): ChatService {
  const remote = new SupabaseChatRepository(supabase);
  return new ChatService(new CachedChatRepository(remote, cache));
}
