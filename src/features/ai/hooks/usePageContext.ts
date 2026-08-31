import { useCallback } from 'react';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { BuiltPageContext } from '@/shared/llm/build-page-context';
import { IPC_AI_GET_PAGE_CONTEXT } from '@/shared/schemas/message-schemas';

interface PageContextHighlight {
  id?: string;
  url: string;
  text: string;
}

export function usePageContext(): {
  fetch: (
    highlights: PageContextHighlight[]
  ) => Promise<
    { success: true; data: BuiltPageContext } | { success: false; error: string }
  >;
} {
  const getPageContext = useIpcAction<
    { highlights: PageContextHighlight[] },
    BuiltPageContext
  >(IPC_AI_GET_PAGE_CONTEXT);

  const fetch = useCallback(
    async (highlights: PageContextHighlight[]) => {
      return getPageContext({ highlights });
    },
    [getPageContext]
  );

  return { fetch };
}
