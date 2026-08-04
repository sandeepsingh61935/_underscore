export type AccountPillLabel = 'Guest' | 'Free' | 'Paid' | 'Past due';

export function resolveAccountPillLabel(input: {
  modeId: string | null | undefined;
  isAuthenticated: boolean;
  isPaidActive: boolean;
  billingStatus?: string | null;
}): AccountPillLabel {
  const status = input.billingStatus ?? null;
  if (status === 'past_due') return 'Past due';
  if (!input.isAuthenticated || input.modeId === 'basic' || !input.modeId) {
    return 'Guest';
  }
  if (input.isPaidActive) return 'Paid';
  return 'Free';
}
