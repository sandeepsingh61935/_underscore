/**
 * Design contract: src/ui-system/theme/global.css (Plan pill section)
 * Billing status pill — status, NOT a button. Variants: free | paid |
 * past-due (+ warn alias). Dot: --synced default, --accent paid,
 * --ttl-low warn, --ttl-expired past-due.
 */
import React from 'react';

import { cn } from '../../utils/cn';

export type PlanStatus = 'free' | 'paid' | 'past-due' | 'loading';

export interface PlanPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: PlanStatus;
}

const STATUS_LABEL: Record<PlanStatus, string> = {
  free: 'Free',
  paid: 'Paid',
  'past-due': 'Past due',
  loading: '…',
};

export function PlanPill({
  status = 'free',
  className,
  children,
  ...props
}: PlanPillProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'plan-pill',
        status === 'paid' && 'is-paid',
        status === 'past-due' && 'is-past-due',
        className
      )}
      data-status={status}
      {...props}
    >
      <span className="plan-dot" aria-hidden="true" />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
