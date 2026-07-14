/**
 * Push/pop stack for Connect to AI subflow inside Settings.
 */

import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { getMcpAiApp } from '@/features/settings/mcp/mcp-ai-apps';

export type ConnectToAiScreen =
  | { kind: 'hub' }
  | { kind: 'picker' }
  | { kind: 'setup'; appId: McpAiAppId };

export function connectToAiPageTitle(screen: ConnectToAiScreen): string {
  switch (screen.kind) {
    case 'hub':
      return 'Connect to AI';
    case 'picker':
      return 'Add an AI app';
    case 'setup':
      return `Connect ${getMcpAiApp(screen.appId).name}`;
  }
}

export function connectToAiBackLabel(
  stack: readonly ConnectToAiScreen[],
): string {
  if (stack.length <= 1) {
    return '← Settings';
  }
  const screen = stack[stack.length - 1]!;
  const prev = stack[stack.length - 2]!;
  if (screen.kind === 'setup' && prev.kind === 'picker') {
    return '← Add an AI app';
  }
  if (screen.kind === 'setup' && prev.kind === 'hub') {
    return '← Connect to AI';
  }
  if (screen.kind === 'picker') {
    return '← Connect to AI';
  }
  return `← ${connectToAiPageTitle(prev)}`;
}

export function pushConnectScreen(
  stack: readonly ConnectToAiScreen[],
  next: ConnectToAiScreen,
): ConnectToAiScreen[] {
  const top = stack[stack.length - 1];
  if (top && top.kind === next.kind && (next.kind !== 'setup' || (top.kind === 'setup' && top.appId === next.appId))) {
    return [...stack];
  }
  return [...stack, next];
}

export function popConnectScreen(
  stack: readonly ConnectToAiScreen[],
): ConnectToAiScreen[] {
  if (stack.length <= 1) {
    return [{ kind: 'hub' }];
  }
  return stack.slice(0, -1);
}
