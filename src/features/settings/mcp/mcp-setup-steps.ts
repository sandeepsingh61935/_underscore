/**
 * Shared MCP host setup checklist labels (Option B).
 * Extension uses interactive steps; web uses the same order with extension-aware copy.
 */

import type { McpAiAppDef } from '@/features/settings/mcp/mcp-ai-apps';

export type McpSetupVariant = 'extension' | 'web';

/** Five-step checklist; copy differs only where the bridge is managed. */
export function mcpSetupStepLabels(
  app: McpAiAppDef,
  variant: McpSetupVariant,
): readonly string[] {
  if (variant === 'web') {
    return [
      'Turn on the bridge in the _underscore extension (Integrations)',
      'Copy the security code from the extension',
      `Add the server to ${app.configLabel}`,
      app.restartLabel,
      'Check connection from the extension',
    ] as const;
  }
  return [
    'Turn on in _underscore',
    'Copy security code',
    'Add server to client config',
    app.restartLabel,
    'Check connection',
  ] as const;
}
