import { pageHrefForLibrary } from '@/shared/utils/page-href';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';

export function phoneHighlightHref(highlight: {
  domain: string;
  path: string;
  quote: string;
}): string | null {
  const pageUrl = pageHrefForLibrary(highlight.domain, highlight.path);
  if (!pageUrl) return null;
  return buildTextFragmentUrl(pageUrl, { exact: highlight.quote });
}
