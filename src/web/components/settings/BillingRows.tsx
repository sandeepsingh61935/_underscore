/**
 * Shared Upgrade / Manage / Update / Sync rows for Account + Plan tabs.
 * Labels from resolveSettingsBillingCta — never "Portal" as product language.
 */

import React from 'react';
import type { SettingsBillingCta } from '@/shared/utils/settings-billing-cta';

export interface BillingRowsProps {
  cta: SettingsBillingCta;
  busy?: boolean;
  error?: string | null;
  loadError?: string | null;
  loadState?: string;
  onAction: () => void;
  onSync?: () => void;
  onRetry?: () => void;
}

export function BillingRows({
  cta,
  busy,
  error,
  loadError,
  loadState,
  onAction,
  onSync,
  onRetry,
}: BillingRowsProps): React.ReactElement {
  if (loadState === 'error') {
    return (
      <div className="setting-row" data-od-id="billing-error-row">
        <div className="grow">
          <div className="title">Billing</div>
          <div className="sub">{loadError || 'Could not load billing.'}</div>
        </div>
        <button
          type="button"
          className="trail-link"
          data-od-id="billing-error-row-cta"
          disabled={busy}
          onClick={() => onRetry?.()}
        >
          Retry
        </button>
      </div>
    );
  }

  const odId =
    cta.kind === 'upgrade'
      ? 'billing-upgrade-row'
      : cta.kind === 'update_payment'
        ? 'billing-pastdue-row'
        : 'billing-manage-row';

  const sub = error || loadError || cta.sub;

  return (
    <>
      <div className="setting-row" data-od-id={odId}>
        <div className="grow">
          <div className="title">{cta.title}</div>
          <div className="sub">{sub}</div>
        </div>
        {busy ? (
          <span className="plan-pill spin">…</span>
        ) : (
          <button
            type="button"
            className="trail-link"
            data-od-id={`${odId}-cta`}
            data-billing-kind={cta.kind}
            data-testid="billing-cta"
            onClick={onAction}
          >
            {cta.ctaLabel}
          </button>
        )}
      </div>
      {cta.showSync && onSync ? (
        <div className="setting-row" data-od-id="billing-sync-row">
          <div className="grow">
            <div className="title">Refresh subscription status</div>
            <div className="sub">After Polar checkout if status lags</div>
          </div>
          {busy ? (
            <span className="plan-pill spin">…</span>
          ) : (
            <button
              type="button"
              className="trail-link"
              data-od-id="billing-sync-row-cta"
              data-testid="billing-sync-cta"
              onClick={onSync}
            >
              Refresh
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
