import { describe, expect, it } from 'vitest';

import {
  connectToAiBackLabel,
  connectToAiPageTitle,
  popConnectScreen,
  pushConnectScreen,
  type ConnectToAiScreen,
} from '@/features/settings/mcp/connect-to-ai-nav';

describe('connect-to-ai-nav', () => {
  it('titles hub, picker, and setup by app name', () => {
    expect(connectToAiPageTitle({ kind: 'hub' })).toBe('Integrations');
    expect(connectToAiPageTitle({ kind: 'picker' })).toBe('Host tips');
    expect(connectToAiPageTitle({ kind: 'setup', appId: 'cursor' })).toBe('Connect Cursor');
  });

  it('uses contextual back labels for Setup → Picker → Hub', () => {
    const stack: ConnectToAiScreen[] = [
      { kind: 'hub' },
      { kind: 'picker' },
      { kind: 'setup', appId: 'claude-code' },
    ];
    expect(connectToAiBackLabel(stack)).toBe('← Host tips');
    expect(connectToAiBackLabel(stack.slice(0, 2))).toBe('← Integrations');
    expect(connectToAiBackLabel([{ kind: 'hub' }])).toBe('← Settings');
  });

  it('pushes and pops without dropping below hub', () => {
    let stack: ConnectToAiScreen[] = [{ kind: 'hub' }];
    stack = pushConnectScreen(stack, { kind: 'picker' });
    stack = pushConnectScreen(stack, { kind: 'setup', appId: 'gemini' });
    expect(stack).toHaveLength(3);
    stack = popConnectScreen(stack);
    expect(stack[stack.length - 1]).toEqual({ kind: 'picker' });
    stack = popConnectScreen(stack);
    expect(stack).toEqual([{ kind: 'hub' }]);
    stack = popConnectScreen(stack);
    expect(stack).toEqual([{ kind: 'hub' }]);
  });
});
