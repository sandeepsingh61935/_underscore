/**
 * Settings tab panels — OD underscore-web-app-prototype parity.
 * No force-billing / design-inspection controls in production web.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  BillingReturnBanners,
  type BillingReturnKind,
} from './BillingReturnBanners';
import { BillingRows } from './BillingRows';

import {
  BUILTIN_TYPE_PRESET_LIST,
  BUILTIN_TYPE_PRESETS,
  type BuiltinTypePresetId,
} from '@/shared/constants/type-presets';
import type { ThemeType } from '@/shared/types/theme';
import type { SettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import { useTypePreset } from '@/ui-system/hooks/useTypePreset';
import type { WebCaps, WebPlanLabel } from '@/web/caps/resolveWebCaps';
import {
  applyWebPrefs,
  readWebPrefs,
  writeWebPrefs,
  type WebDensity,
} from '@/web/lib/webPrefs';


function formatPeriodEnd(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function planTitle(opts: {
  isGuest: boolean;
  isPaidActive: boolean;
  isPastDue: boolean;
}): string {
  if (opts.isGuest) return 'Guest';
  if (opts.isPastDue) return 'Account · past due';
  if (opts.isPaidActive) return 'Account (Paid)';
  return 'Account (Free)';
}

function planSub(opts: {
  isGuest: boolean;
  isPaidActive: boolean;
  isPastDue: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
}): string {
  if (opts.isGuest) return 'Sign in to sync, export, and upgrade';
  if (opts.cancelAtPeriodEnd) {
    return `Access until ${formatPeriodEnd(opts.currentPeriodEnd)} · cancel scheduled`;
  }
  if (opts.isPaidActive) {
    return opts.currentPeriodEnd
      ? `Renews ${formatPeriodEnd(opts.currentPeriodEnd)}`
      : 'Paid · AI & agents';
  }
  if (opts.isPastDue) return 'Fix payment in Polar to restore AI';
  return 'Free is your Starter account · Sync & export';
}

function planPillClass(label: WebPlanLabel): string {
  if (label === 'Paid') return 'plan-pill paid';
  if (label === 'Past due') return 'plan-pill warn';
  return 'plan-pill';
}

export type SharedBillingProps = {
  isAuthenticated: boolean;
  caps: WebCaps;
  cta: SettingsBillingCta | null;
  busy: boolean;
  error: string | null;
  loadError: string | null;
  loadState: string;
  returnKind: BillingReturnKind;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  handoff: 'checkout' | 'portal' | null;
  onBillingAction: () => void;
  onSync: () => void;
  onRetry: () => void;
  onDismissReturn: () => void;
};

function BillingChrome({
  returnKind,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  busy,
  handoff,
  onSync,
  onDismissReturn,
}: Pick<
  SharedBillingProps,
  | 'returnKind'
  | 'cancelAtPeriodEnd'
  | 'currentPeriodEnd'
  | 'busy'
  | 'handoff'
  | 'onSync'
  | 'onDismissReturn'
>): React.ReactElement {
  return (
    <>
      <BillingReturnBanners
        returnKind={returnKind}
        cancelAtPeriodEnd={cancelAtPeriodEnd && returnKind === null}
        currentPeriodEnd={currentPeriodEnd}
        busy={busy}
        onSync={onSync}
        onDismiss={onDismissReturn}
      />
      {handoff === 'checkout' ? (
        <div className="billing-handoff" data-od-id="billing-handoff-checkout">
          <p className="bh-title">Opening Polar checkout…</p>
          <p className="bh-body">
            Secure payment runs on Polar. No card details are collected in _underscore.
          </p>
        </div>
      ) : null}
      {handoff === 'portal' ? (
        <div className="billing-handoff" data-od-id="billing-handoff-portal">
          <p className="bh-title">Opening Polar portal…</p>
          <p className="bh-body">Invoices, payment method, and cancel live in Polar.</p>
        </div>
      ) : null}
    </>
  );
}

export function AccountPanel({
  email,
  planLabel,
  billing,
  onSignOut,
}: {
  email: string | null;
  planLabel: WebPlanLabel;
  billing: SharedBillingProps;
  onSignOut?: () => void;
}): React.ReactElement {
  const { isAuthenticated, caps, cta, busy, error, loadError, loadState } = billing;

  return (
    <div className="settings-panel is-tab-enter" data-od-id="settings-account">
      <h2>Account</h2>
      <p className="lead">
        Identity and plan at a glance. Billing opens Polar — never a card form here.
      </p>
      <BillingChrome {...billing} />
      <div className="block">
        <p className="block-label">Profile</p>
        <div className="setting-row" data-od-id="settings-account-row">
          {isAuthenticated && email ? (
            <div className="avatar" aria-hidden="true">
              {email.slice(0, 1).toUpperCase()}
            </div>
          ) : null}
          <div className="grow">
            <div className="title">{isAuthenticated && email ? email : 'Not signed in'}</div>
            <div className="sub">
              {isAuthenticated
                ? planTitle({
                    isGuest: false,
                    isPaidActive: caps.isPaidActive,
                    isPastDue: caps.isPastDue,
                  })
                : 'Local only · sign in for sync'}
            </div>
          </div>
          {planLabel !== 'Guest' ? (
            <span className={planPillClass(planLabel)} data-od-id="settings-plan-pill">
              {planLabel}
            </span>
          ) : null}
          {isAuthenticated ? (
            <button
              type="button"
              className="btn sm"
              data-od-id="sign-out"
              onClick={() => onSignOut?.()}
            >
              Sign out
            </button>
          ) : (
            <Link to="/sign-in" className="btn primary sm" data-od-id="settings-signin">
              Sign in
            </Link>
          )}
        </div>
      </div>
      <div className="block" data-od-id="settings-billing-block">
        <p className="block-label">Billing</p>
        {isAuthenticated && cta ? (
          <BillingRows
            cta={cta}
            busy={busy}
            error={error}
            loadError={loadError}
            loadState={loadState}
            onAction={billing.onBillingAction}
            onSync={billing.onSync}
            onRetry={billing.onRetry}
          />
        ) : (
          <div className="setting-row">
            <div className="grow">
              <div className="title">Sign in to upgrade</div>
              <div className="sub">Free sync after sign-in · Account (Paid) for AI</div>
            </div>
            <Link to="/sign-in" className="btn primary sm">
              Sign in
            </Link>
          </div>
        )}
      </div>
      <div className="block">
        <p className="block-label">Capabilities</p>
        <div className="cap-list" data-od-id="mode-caps">
          <span className={`cap ${caps.flags.sync ? 'on' : 'off'}`}>Sync</span>
          <span className={`cap ${caps.flags.export ? 'on' : 'off'}`}>Export</span>
          <span className={`cap ${caps.flags.ai ? 'on' : 'off'}`}>AI</span>
          <span className={`cap ${caps.flags.mcp ? 'on' : 'off'}`}>MCP</span>
        </div>
      </div>
    </div>
  );
}

export function PlanPanel({
  billing,
}: {
  billing: SharedBillingProps;
}): React.ReactElement {
  const {
    isAuthenticated,
    caps,
    cta,
    busy,
    error,
    loadError,
    loadState,
    cancelAtPeriodEnd,
    currentPeriodEnd,
  } = billing;

  return (
    <div className="settings-panel is-tab-enter" data-od-id="settings-plan">
      <h2>Plan</h2>
      <p className="lead">
        Free vs Account (Paid) via Polar. Upgrade opens checkout; manage opens the customer portal.
        No prices invented here.
      </p>
      <BillingChrome {...billing} />
      <div
        className="setting-row plan-current"
        data-od-id="plan-current"
      >
        <div className="grow">
          <div className="title">
            {planTitle({
              isGuest: caps.isGuest,
              isPaidActive: caps.isPaidActive,
              isPastDue: caps.isPastDue,
            })}
          </div>
          <div className="sub">
            {planSub({
              isGuest: caps.isGuest,
              isPaidActive: caps.isPaidActive,
              isPastDue: caps.isPastDue,
              cancelAtPeriodEnd,
              currentPeriodEnd,
            })}
          </div>
        </div>
        {!caps.isGuest ? (
          <span className={planPillClass(caps.planLabel)}>{caps.planLabel}</span>
        ) : null}
      </div>
      {isAuthenticated && cta ? (
        <BillingRows
          cta={cta}
          busy={busy}
          error={error}
          loadError={loadError}
          loadState={loadState}
          onAction={billing.onBillingAction}
          onSync={billing.onSync}
          onRetry={billing.onRetry}
        />
      ) : (
        <div className="setting-row">
          <div className="grow">
            <div className="title">Sign in required</div>
            <div className="sub">Then Upgrade to Account (Paid) via Polar</div>
          </div>
          <Link to="/sign-in" className="btn primary sm">
            Sign in
          </Link>
        </div>
      )}
      <div className="block" style={{ marginTop: 24 }}>
        <p className="block-label">Compare</p>
        <div className="plan-cards" data-od-id="plan-compare">
          <div className="plan-card">
            <h3>Free</h3>
            <ul>
              <li>Sync</li>
              <li>Export</li>
              <li>Permanent library</li>
            </ul>
          </div>
          <div className="plan-card featured">
            <h3>Account (Paid)</h3>
            <ul>
              <li>Everything Free</li>
              <li>Chat · Summarize</li>
              <li>Models &amp; providers (BYOK)</li>
              <li>Integrations (MCP)</li>
            </ul>
            {isAuthenticated && !caps.isPaidActive ? (
              <button
                type="button"
                className="btn accent sm"
                data-od-id="upgrade-paid"
                disabled={busy}
                onClick={billing.onBillingAction}
              >
                Continue to Polar →
              </button>
            ) : caps.isPaidActive ? (
              <button
                type="button"
                className="btn sm"
                data-od-id="manage-portal"
                disabled={busy}
                onClick={billing.onBillingAction}
              >
                Manage
              </button>
            ) : (
              <Link to="/sign-in" className="btn accent sm">
                Sign in to upgrade
              </Link>
            )}
            <div className="plan-card-note">Cancel anytime in the billing portal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const THEME_OPTS: ThemeType[] = ['light', 'dark', 'system'];
const DENSITY_OPTS: WebDensity[] = ['compact', 'comfortable', 'roomy'];

export function AppearancePanel({
  theme,
  onThemeChange,
}: {
  theme: ThemeType | string;
  onThemeChange: (t: ThemeType) => void;
}): React.ReactElement {
  const themeValue = (THEME_OPTS.includes(theme as ThemeType)
    ? theme
    : 'system') as ThemeType;
  const { selection, displayName, setSelection } = useTypePreset();
  const [density, setDensity] = useState<WebDensity>(() => readWebPrefs().density);

  useEffect(() => {
    applyWebPrefs(readWebPrefs());
  }, []);

  const handleDensity = useCallback((d: WebDensity) => {
    setDensity(d);
    writeWebPrefs({ density: d });
  }, []);

  const handlePreset = useCallback(
    (id: BuiltinTypePresetId) => {
      void setSelection({ kind: 'builtin', id });
    },
    [setSelection],
  );

  const activePresetId =
    selection.kind === 'builtin' ? selection.id : null;

  return (
    <div className="settings-panel is-tab-enter" data-od-id="settings-appearance">
      <h2>Appearance</h2>
      <p className="lead">Theme, type, and density — same system as the extension.</p>
      <div className="block">
        <p className="block-label">Theme</p>
        <div className="seg" role="radiogroup" aria-label="Theme" data-od-id="theme-seg">
          {THEME_OPTS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={themeValue === t}
              className={themeValue === t ? 'active' : ''}
              onClick={() => onThemeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="block" data-od-id="settings-typography">
        <p className="block-label">Typography</p>
        <p className="type-sub">{displayName}</p>
        <div className="type-preset-grid" role="list">
          {BUILTIN_TYPE_PRESET_LIST.map((id) => {
            const preset = BUILTIN_TYPE_PRESETS[id];
            return (
              <button
                key={id}
                type="button"
                role="listitem"
                className={`type-preset-chip${activePresetId === id ? ' active' : ''}`}
                data-od-id={`type-preset-${id}`}
                onClick={() => handlePreset(id)}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="block">
        <p className="block-label">Density</p>
        <div className="seg" role="radiogroup" aria-label="Density" data-od-id="density-seg">
          {DENSITY_OPTS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={density === d}
              className={density === d ? 'active' : ''}
              onClick={() => handleDensity(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { AiPanel } from './AiPanel';

export function DataPanel({
  caps,
  isAuthenticated,
  onExport,
  onSync,
  syncing,
  lastSyncedLabel,
}: {
  caps: WebCaps;
  isAuthenticated: boolean;
  onExport: (format: 'md' | 'xlsx') => void;
  onSync: () => void;
  syncing?: boolean;
  lastSyncedLabel?: string;
}): React.ReactElement {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e: MouseEvent): void => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [exportOpen]);

  return (
    <div className="settings-panel is-tab-enter" data-od-id="settings-data">
      <h2>Data</h2>
      <p className="lead">Sync, download, and delete.</p>
      {isAuthenticated ? (
        <div className="block" data-od-id="settings-sync-block">
          <div className="setting-row">
            <div className="grow">
              <div className="title">Cloud sync</div>
              <div className="sub">
                {caps.flags.sync
                  ? lastSyncedLabel || 'Library loads from cloud on this device'
                  : 'Sign in on Starter+'}
              </div>
            </div>
            <button
              type="button"
              className={`btn sm${caps.flags.sync ? ' primary' : ''}`}
              data-od-id="settings-sync"
              disabled={!caps.flags.sync}
              aria-disabled={!caps.flags.sync}
            >
              {caps.flags.sync ? 'On' : 'Off'}
            </button>
          </div>
          <div className="setting-row">
            <div className="grow">
              <div className="title">Sync now</div>
            </div>
            <button
              type="button"
              className="btn sm primary"
              disabled={!caps.flags.sync || syncing}
              aria-busy={syncing}
              onClick={onSync}
            >
              {syncing ? '…' : 'Sync'}
            </button>
          </div>
        </div>
      ) : null}
      <div className="block">
        <div className="setting-row">
          <div className="grow">
            <div className="title">Download library</div>
          </div>
          <div className="export-menu" data-od-id="settings-export" ref={exportRef}>
            <button
              type="button"
              className="btn sm"
              data-od-id="settings-export-btn"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              disabled={!caps.flags.export}
              onClick={() => setExportOpen((o) => !o)}
            >
              Download
              <svg
                className="chev"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 4.5 6 8l3-3.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {exportOpen ? (
              <div
                className="export-menu-pop"
                role="menu"
                data-od-id="settings-export-menu"
              >
                <button
                  type="button"
                  className="export-menu-item"
                  role="menuitem"
                  data-od-id="settings-export-md"
                  disabled={!caps.flags.export}
                  onClick={() => {
                    onExport('md');
                    setExportOpen(false);
                  }}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  className="export-menu-item"
                  role="menuitem"
                  data-od-id="settings-export-xlsx"
                  disabled={!caps.flags.export}
                  onClick={() => {
                    onExport('xlsx');
                    setExportOpen(false);
                  }}
                >
                  Spreadsheet
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="block">
        <p className="block-label">Danger zone</p>
        <div className="danger-zone">
          <div className="setting-row">
            <div className="grow">
              <div className="title">Delete library</div>
              <div className="sub">
                {isAuthenticated
                  ? 'Bulk delete is available in the extension for now. Web delete is not enabled yet.'
                  : 'Sign in and use the extension to delete a cloud library.'}
              </div>
            </div>
            <button
              type="button"
              className="btn sm danger"
              data-od-id="settings-delete"
              disabled
              title="Not available on web yet"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
