import {
  fillMcpConfigTemplate,
  type McpAiAppDef,
} from '@/features/settings/mcp/mcp-ai-apps';

export interface HostConnectionTip {
  pasteTarget: string;
  snippet: string;
  restart: string;
  hint: string;
}

/** Amateur host tip: where to paste, URL-only snippet, restart. No JWT. */
export function resolveHostConnection(
  app: McpAiAppDef,
  remoteUrl: string,
): HostConnectionTip {
  return {
    pasteTarget: app.configLabel,
    snippet: fillMcpConfigTemplate(app.configTemplate, { url: remoteUrl }),
    restart: app.restartLabel,
    hint: amateurHostHint(app),
  };
}

function amateurHostHint(app: McpAiAppDef): string {
  if (app.id === 'chatgpt-desktop') {
    return 'Paste the remote URL in ChatGPT connectors. Approve when the browser opens.';
  }
  return `Paste the remote URL in ${app.configLabel}.`;
}
