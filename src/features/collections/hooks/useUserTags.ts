/**
 * @file useUserTags.ts
 * @description Fetch normalized user labels for autocomplete suggestions.
 */

import { useCallback, useEffect, useState } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { GET_USER_TAGS } from '@/shared/schemas/message-schemas';
import { fetchUserTagsWeb } from '@/shared/services/tag-query-web';
import type { TagEntity } from '@/shared/types/tag-entity';

function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    chrome.runtime.id !== undefined
  );
}

export function useUserTags(isAuthenticated = true): {
  tags: TagEntity[];
  tagNames: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getTagsAction = useIpcAction<
    Record<string, never>,
    { tags: Array<{ id: string; name: string; createdAt: string }> }
  >(GET_USER_TAGS);

  const fetchTags = useCallback(async () => {
    if (!isAuthenticated) {
      setTags([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isExtensionContext()) {
        const result = await getTagsAction({});
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch user labels');
        }
        setTags(
          (result.data.tags ?? []).map((tag) => ({
            id: tag.id,
            name: tag.name,
            createdAt: new Date(tag.createdAt),
          }))
        );
      } else {
        const { getWebSupabaseClient } =
          await import('@/shared/auth/supabase-web-client');
        const supabase = getWebSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setTags([]);
          return;
        }
        setTags(await fetchUserTagsWeb(supabase, session.user.id));
      }
    } catch (err) {
      setTags([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch user labels'));
    } finally {
      setIsLoading(false);
    }
  }, [getTagsAction, isAuthenticated]);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  return {
    tags,
    tagNames: tags.map((tag) => tag.name),
    isLoading,
    error,
    refetch: fetchTags,
  };
}
