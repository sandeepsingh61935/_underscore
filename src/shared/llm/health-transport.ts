/**
 * Explicit cloud health transport policy (ADR-027 review).
 * Ollama is always direct. Cloud: proxy when token present; else direct only
 * if the platform allows it (extension host_permissions). Web without token
 * is unavailable — never silent CORS-doomed direct.
 */

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { usesWebProxy } from '@/shared/llm/runtime/proxy-policy';

export type CloudHealthTransport = 'proxy' | 'direct' | 'unavailable';

export function resolveCloudHealthTransport(opts: {
  provider: ProviderName;
  accessToken?: string | null;
  /**
   * Extension popup/SW may call cloud providers directly.
   * Web must leave this false/undefined so missing token ≠ direct fetch.
   */
  allowDirectCloud?: boolean;
}): CloudHealthTransport {
  if (!usesWebProxy(opts.provider)) {
    return 'direct';
  }
  if (opts.accessToken?.trim()) {
    return 'proxy';
  }
  if (opts.allowDirectCloud) {
    return 'direct';
  }
  return 'unavailable';
}
