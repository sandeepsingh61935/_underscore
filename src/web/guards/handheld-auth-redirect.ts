import type { WebClientKind } from '@/web/lib/classify-web-client';
import { isHandheldClient } from '@/web/lib/classify-web-client';

export function handheldAuthRedirect(
  isAuthenticated: boolean,
  kind: WebClientKind,
  returnTo: string
): string | null {
  if (isAuthenticated || !isHandheldClient(kind)) return null;
  return `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
}
