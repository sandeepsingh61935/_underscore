/**
 * Product Connected truth for Integrations (ADR-029 §4).
 * Copying a snippet is never Connected.
 */

export type IntegrationsStatus = 'off' | 'ready' | 'connected';

export function resolveIntegrationsStatus(input: {
  mcpAllowed: boolean;
  oauthGrantCount: number;
  hasRecentSession: boolean;
  /** Ignored — leftover from bridge-era optimistic Active. */
  snippetCopied?: boolean;
}): IntegrationsStatus {
  if (!input.mcpAllowed) return 'off';
  if (input.oauthGrantCount > 0 || input.hasRecentSession) return 'connected';
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
