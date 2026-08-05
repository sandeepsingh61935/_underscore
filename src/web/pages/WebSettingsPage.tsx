/**
 * @file WebSettingsPage.tsx
 * @description Product Settings — OD tabbed shell (account | plan | appearance | ai | data).
 * Polar checkout/portal only; no force-billing UI.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { freeEntitlement } from '@/shared/billing';
import { downloadTextFile } from '@/shared/highlight-export';
import type { ThemeType } from '@/shared/types/theme';
import { resolveSettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import {
  AccountPanel,
  AiPanel,
  AppearancePanel,
  DataPanel,
  PlanPanel,
  type SharedBillingProps,
} from '@/web/components/settings/settingsPanels';
import type { BillingReturnKind } from '@/web/components/settings/BillingReturnBanners';
import { useWebLibrary } from '@/web/hooks/useWebLibrary';
import {
  buildSettingsSearch,
  parseSettingsTab,
  type SettingsTab,
} from '@/web/routing/settingsTab';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'plan', label: 'Plan' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'ai', label: 'AI & MCP' },
  { id: 'data', label: 'Data' },
];

export function WebSettingsPage(): React.ReactElement {
  const { isAuthenticated, user, theme, setTheme, logout } = useApp();
  const billing = useBillingContextOptional();
  const location = useLocation();
  const navigate = useNavigate();

  const tab = parseSettingsTab(location.search);

  const entitlement = billing?.snapshot.entitlement ?? freeEntitlement();
  // Never demote paid on load error — use entitlement when snapshot gate is not ready.
  const isPaidActive = billing
    ? billing.snapshot.loadState === 'ready'
      ? billing.snapshot.isPaidActive
      : Boolean(
          billing.snapshot.entitlement.isPaidActive || billing.snapshot.isPaidActive,
        )
    : false;

  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: entitlement.status,
      }),
    [isAuthenticated, isPaidActive, entitlement.status],
  );

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });

  const [billingActionError, setBillingActionError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<'checkout' | 'portal' | null>(null);
  const [returnKind, setReturnKind] = useState<BillingReturnKind>(null);
  const [returnDismissed, setReturnDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flag = new URLSearchParams(window.location.search).get('billing');
    if (flag === 'success') {
      setReturnDismissed(false);
      setReturnKind(isPaidActive ? 'success_active' : 'success_pending');
      return;
    }
    if (flag === 'cancel') {
      setReturnDismissed(false);
      setReturnKind('cancel');
      return;
    }
    if (isPaidActive && returnKind === 'success_pending') {
      setReturnKind('success_active');
    }
  }, [isPaidActive, returnKind]);

  const cta = billing
    ? resolveSettingsBillingCta({
        isPaidActive,
        status: entitlement.status,
        cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      })
    : null;

  const setTab = useCallback(
    (next: SettingsTab) => {
      navigate(
        { pathname: '/settings', search: buildSettingsSearch(next) },
        { replace: true },
      );
    },
    [navigate],
  );

  const clearHandoffSoon = useCallback(() => {
    window.setTimeout(() => setHandoff(null), 4000);
  }, []);

  const handleBillingAction = useCallback(() => {
    if (!cta || !billing) return;
    setBillingActionError(null);
    const isPortal = cta.action === 'portal';
    setHandoff(isPortal ? 'portal' : 'checkout');
    clearHandoffSoon();
    const action = isPortal ? billing.openPortal : billing.startCheckout;
    void action().catch((e: unknown) => {
      setHandoff(null);
      setBillingActionError(e instanceof Error ? e.message : 'Billing action failed');
    });
  }, [billing, cta, clearHandoffSoon]);

  const handleSyncBilling = useCallback(() => {
    if (!billing) return;
    setBillingActionError(null);
    void billing.syncFromPolar().catch((e: unknown) => {
      setBillingActionError(e instanceof Error ? e.message : 'Refresh failed');
    });
  }, [billing]);

  const handleRetryBilling = useCallback(() => {
    if (!billing) return;
    void billing.refresh();
  }, [billing]);

  const handleUpgradeFromAi = useCallback(() => {
    if (!billing) return;
    setHandoff('checkout');
    clearHandoffSoon();
    void billing.startCheckout().catch((e: unknown) => {
      setHandoff(null);
      setBillingActionError(e instanceof Error ? e.message : 'Billing action failed');
    });
  }, [billing, clearHandoffSoon]);

  const handleExport = useCallback(() => {
    if (!caps.flags.export) return;
    const payload = lib.highlights.map((h) => ({
      id: h.id,
      domain: h.domain,
      path: h.path,
      quote: h.quote,
      note: h.note,
      tags: h.tags,
      savedAt: new Date(h.savedAt).toISOString(),
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `underscore-library-${stamp}.json`,
      JSON.stringify(payload, null, 2),
    );
  }, [caps.flags.export, lib.highlights]);

  const handleDataSync = useCallback(() => {
    void lib.refresh();
  }, [lib]);

  const sharedBilling: SharedBillingProps = {
    isAuthenticated,
    caps,
    cta,
    busy: billing?.busy ?? false,
    error: billingActionError,
    loadError: billing?.snapshot.error ?? null,
    loadState: billing?.snapshot.loadState ?? 'idle',
    returnKind: returnDismissed ? null : returnKind,
    cancelAtPeriodEnd: Boolean(entitlement.cancelAtPeriodEnd),
    currentPeriodEnd: entitlement.currentPeriodEnd,
    handoff,
    onBillingAction: handleBillingAction,
    onSync: handleSyncBilling,
    onRetry: handleRetryBilling,
    onDismissReturn: () => setReturnDismissed(true),
  };

  let panel: React.ReactElement;
  switch (tab) {
    case 'plan':
      panel = <PlanPanel billing={sharedBilling} />;
      break;
    case 'appearance':
      panel = (
        <AppearancePanel
          theme={theme}
          onThemeChange={(t: ThemeType) => setTheme(t)}
        />
      );
      break;
    case 'ai':
      panel = (
        <AiPanel
          caps={caps}
          isAuthenticated={isAuthenticated}
          onUpgrade={handleUpgradeFromAi}
        />
      );
      break;
    case 'data':
      panel = (
        <DataPanel
          caps={caps}
          isAuthenticated={isAuthenticated}
          onExport={handleExport}
          onSync={handleDataSync}
          syncing={lib.status === 'loading'}
          lastSyncedLabel={
            lib.status === 'ready' && isAuthenticated
              ? `${lib.highlights.length} highlights loaded`
              : undefined
          }
        />
      );
      break;
    case 'account':
    default:
      panel = (
        <AccountPanel
          email={user?.email ?? null}
          planLabel={caps.planLabel}
          billing={sharedBilling}
          onSignOut={() => {
            void logout();
          }}
        />
      );
  }

  return (
    <div data-od-id="settings">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-od-id="settings-title">
            Settings
          </h1>
        </div>
      </div>
      <div className="settings-grid">
        <nav className="settings-nav" data-od-id="settings-nav" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'active' : ''}
              data-od-id={`settings-tab-${t.id}`}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {panel}
      </div>
    </div>
  );
}
