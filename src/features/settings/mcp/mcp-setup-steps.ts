/**
 * Shared MCP host setup checklist labels (cloud-first, ADR-029).
 */

import type { McpAiAppDef } from '@/features/settings/mcp/mcp-ai-apps';

export type McpSetupVariant = 'extension' | 'web';

/** Cloud Connect checklist. Host-specific restart text only. */
export function mcpSetupStepLabels(
  app: McpAiAppDef,
  _variant: McpSetupVariant,
): readonly string[] {
  const authStep =
    app.authHint === 'oauth'
      ? 'Approve OAuth when the host prompts (public hosts)'
      : 'Use OAuth if the host supports it, or paste a Bearer JWT for scripts';
  return [
    'Copy the remote MCP URL from Integrations',
    authStep,
    `Add the server to ${app.configLabel}`,
    app.restartLabel,
    'Open a new chat and call get_session — Connected is not “I copied the snippet”',
  ] as const;
}
