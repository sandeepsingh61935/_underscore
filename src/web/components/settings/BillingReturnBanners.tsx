/**
 * Polar checkout return + cancel-scheduled banners (OD data-od-id parity).
 */

import React from 'react';

export type BillingReturnKind =
  | 'success_pending'
  | 'success_active'
  | 'cancel'
  | null;

export interface BillingReturnBannersProps {
  returnKind: BillingReturnKind;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  busy?: boolean;
  onSync?: () => void;
  onDismiss?: () => void;
}

function formatPeriodEnd(iso: string | null | undefined): string {
  if (!iso) return 'period end';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'period end';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BillingReturnBanners({
  returnKind,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  busy,
  onSync,
  onDismiss,
}: BillingReturnBannersProps): React.ReactElement | null {
  if (returnKind === 'success_pending') {
    return (
      <div className="billing-banner" data-od-id="billing-return-pending" role="status">
        <p className="bb-title">Payment successful</p>
        <p className="bb-body">
          Activating Account (Paid)… stay on this page. Reopen the extension with the same login
          when Active.
        </p>
        <div className="bb-actions">
          <span className="plan-pill spin">Confirming subscription…</span>
          {onSync ? (
            <button
              type="button"
              className="btn sm"
              data-od-id="billing-return-sync"
              disabled={busy}
              onClick={onSync}
            >
              Sync now
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" className="btn sm ghost" onClick={onDismiss}>
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (returnKind === 'success_active') {
    return (
      <div className="billing-banner" data-od-id="billing-return-active" role="status">
        <p className="bb-title">Payment successful</p>
        <p className="bb-body">
          AI unlocked · reopen the Chrome extension with the same login to use Ask, Summarize, and
          MCP there.
        </p>
        <div className="bb-actions">
          <span className="plan-pill paid">Account (Paid)</span>
          {onDismiss ? (
            <button type="button" className="btn sm ghost" onClick={onDismiss}>
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (returnKind === 'cancel') {
    return (
      <div className="billing-banner" data-od-id="billing-return-cancel" role="status">
        <p className="bb-title">Checkout canceled</p>
        <p className="bb-body">No charge · upgrade anytime below.</p>
        <div className="bb-actions">
          {onDismiss ? (
            <button type="button" className="btn sm ghost" onClick={onDismiss}>
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (cancelAtPeriodEnd) {
    return (
      <div className="billing-banner" data-od-id="billing-cancel-scheduled" role="status">
        <p className="bb-title">Cancel scheduled</p>
        <p className="bb-body">
          You&apos;ll keep Paid features until {formatPeriodEnd(currentPeriodEnd)}. After that,
          account returns to Free. Library stays.
        </p>
      </div>
    );
  }

  return null;
}
