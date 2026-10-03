export const ANALYTICS_EVENT_NAMES = [
  'library_open',
  'highlight_open_source',
  'library_search',
  'group_created',
  'group_deleted',
  'group_item_added',
  'browser_sync_enabled',
  'browser_sync_disabled',
  'group_opened_in_browser',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

const NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const PROP_ALLOW = new Set([
  'client',
  'result_count',
  'rank',
  'reason',
  'kind',
  'tabCount',
  'tab_count',
  'browser',
]);
const PROP_DENY = new Set([
  'quote',
  'q',
  'query',
  'email',
  'text',
  'url',
  'hostname',
  'name',
  'title',
]);

export function parseAnalyticsEvent(raw: unknown):
  | {
      ok: true;
      name: AnalyticsEventName;
      props: Record<string, string | number | boolean>;
    }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid' };
  const rec = raw as { name?: unknown; props?: unknown };
  const name = rec.name;
  if (typeof name !== 'string' || !NAME_SET.has(name)) {
    return { ok: false, error: 'unknown_event' };
  }
  const propsIn =
    rec.props && typeof rec.props === 'object' && !Array.isArray(rec.props)
      ? (rec.props as Record<string, unknown>)
      : {};
  const props: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(propsIn)) {
    if (PROP_DENY.has(k)) continue;
    if (!PROP_ALLOW.has(k)) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      props[k] = v;
    }
  }
  return { ok: true, name: name as AnalyticsEventName, props };
}
