/**
 * Pages Function: POST /api/llm/health
 * ADR-027 cloud provider health via same trust path as stream.
 */

import { handleLlmHealthProxy } from '../../../src/shared/llm/runtime/proxy-handlers';

interface PagesContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  return handleLlmHealthProxy(context.request, context.env);
}
