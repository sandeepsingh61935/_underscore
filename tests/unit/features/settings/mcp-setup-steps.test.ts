import { describe, expect, it } from 'vitest';

import { getMcpAiApp } from '@/features/settings/mcp/mcp-ai-apps';
import { mcpSetupStepLabels } from '@/features/settings/mcp/mcp-setup-steps';

describe('mcpSetupStepLabels', () => {
  it('uses cloud steps and never mentions the extension bridge', () => {
    const steps = mcpSetupStepLabels(getMcpAiApp('cursor'), 'web');
    expect(steps[0]).toMatch(/remote MCP URL/i);
    expect(steps.join(' ')).not.toMatch(/bridge|security code|extension/i);
  });

  it('uses OAuth copy for ChatGPT', () => {
    const steps = mcpSetupStepLabels(getMcpAiApp('chatgpt-desktop'), 'extension');
    expect(steps.some((s) => /oauth/i.test(s))).toBe(true);
  });
});
