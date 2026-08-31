import type { McpAiAppId } from './mcp-ai-apps';
import { MCP_AI_APPS } from './mcp-ai-apps';

import type { OAuthGrantSummary } from '@/shared/oauth/oauth-grants';

/**
 * Soft match OAuth client display names to catalog host ids.
 * Hosts register their own client names (e.g. "Grok", "ChatGPT"); catalog names differ.
 */
const ALIASES: readonly { appId: McpAiAppId; needles: readonly string[] }[] = [
  { appId: 'grok', needles: ['grok', 'xai', 'x.ai'] },
  { appId: 'chatgpt-desktop', needles: ['chatgpt', 'openai', 'chat gpt'] },
  { appId: 'claude-code', needles: ['claude code', 'claude-code'] },
  { appId: 'claude-desktop', needles: ['claude desktop', 'claude'] },
  { appId: 'codex', needles: ['codex'] },
  { appId: 'cursor', needles: ['cursor'] },
  { appId: 'gemini', needles: ['gemini', 'google ai'] },
  { appId: 'antigravity', needles: ['antigravity'] },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Best-effort: first matching catalog host for a grant client name. */
export function matchGrantNameToAppId(clientName: string): McpAiAppId | null {
  const n = normalize(clientName);
  if (!n) return null;

  for (const app of MCP_AI_APPS) {
    if (app.id === 'other') continue;
    const appName = normalize(app.name);
    if (n === appName || n.includes(appName) || appName.includes(n)) {
      return app.id;
    }
  }

  for (const { appId, needles } of ALIASES) {
    if (needles.some((needle) => n.includes(needle) || needle.includes(n))) {
      return appId;
    }
  }

  return null;
}

export function catalogAppIdsWithGrants(
  grants: readonly OAuthGrantSummary[]
): ReadonlySet<McpAiAppId> {
  const ids = new Set<McpAiAppId>();
  for (const g of grants) {
    const id = matchGrantNameToAppId(g.clientName);
    if (id) ids.add(id);
  }
  return ids;
}
