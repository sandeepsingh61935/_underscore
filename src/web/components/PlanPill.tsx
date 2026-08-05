import React from 'react';
import type { WebPlanLabel } from '@/web/caps/resolveWebCaps';

export interface PlanPillProps {
  label: WebPlanLabel;
}

/**
 * Read-only plan badge for web product chrome.
 * No cycle-mode / design-preview interaction.
 */
export function PlanPill({ label }: PlanPillProps): React.ReactElement {
  return (
    <span className="badge-pill" data-od-id="mode-badge" title={label}>
      <span className="dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
