/**
 * Pages Function: POST /api/llm/stream
 * ADR-027 cloud BYOK pass-through (SSE).
 */

import { handleLlmStreamProxy } from '../../../src/shared/llm/runtime/proxy-handlers';

interface PagesContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  return handleLlmStreamProxy(context.request, context.env);
}
