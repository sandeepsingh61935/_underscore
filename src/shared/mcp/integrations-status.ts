export type IntegrationsStatus = 'off' | 'ready' | 'connected';

export function resolveIntegrationsStatus(input: {
  mcpAllowed: boolean;
  oauthGrantCount: number;
}): IntegrationsStatus {
  if (!input.mcpAllowed) return 'off';
  if (input.oauthGrantCount > 0) return 'connected';
  return 'ready';
}

export function integrationsStatusLabel(status: IntegrationsStatus): string {
  switch (status) {
    case 'off':
      return 'Off';
    case 'ready':
      return 'Ready';
    case 'connected':
      return 'Connected';
  }
}
