/**
 * Pages Function: POST /api/analytics
 * Allowlisted consume events only. No quote/query/email.
 */

import { parseAnalyticsEvent } from '../../src/shared/analytics/parse-analytics-event';

interface PagesContext {
  request: Request;
}

function envelope(
  data: unknown,
  error: { message: string } | null,
  status: number
): Response {
  return new Response(JSON.stringify({ data, error, meta: {} }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'POST') {
    return envelope(null, { message: 'method_not_allowed' }, 405);
  }
  let raw: unknown;
  try {
    const text = await context.request.text();
    raw = JSON.parse(text) as unknown;
  } catch {
    return envelope(null, { message: 'invalid_json' }, 400);
  }
  const parsed = parseAnalyticsEvent(raw);
  if (!parsed.ok) {
    return envelope(null, { message: parsed.error }, 400);
  }
  console.info(
    JSON.stringify({
      analytics: true,
      name: parsed.name,
      props: parsed.props,
    })
  );
  return envelope({ ok: true }, null, 200);
}
