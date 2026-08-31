/**
 * @file WebSettingsPage.tsx
 * @description Product Settings — OD tabbed shell (account | plan | appearance | ai | data).
 * Polar checkout/portal only; no force-billing UI.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { SettingsKeyboardSection } from '@/features/settings/components/SettingsKeyboardSection';
import { freeEntitlement } from '@/shared/billing';
import type { ExportFormat } from '@/shared/highlight-export';
import type { ThemeType } from '@/shared/types/theme';
import { deleteLibraryCopy } from '@/shared/utils/confirm-dialog-copy';
import { resolveSettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import type { BillingReturnKind } from '@/web/components/settings/BillingReturnBanners';
import {
  AccountPanel,
  AiPanel,
  AppearancePanel,
  DataPanel,
  PlanPanel,
  type SharedBillingProps,
} from '@/web/components/settings/settingsPanels';
import { useWebHighlightDelete } from '@/web/hooks/useWebHighlightDelete';
import { useWebLibrary } from '@/web/hooks/useWebLibrary';
import { exportWebHighlights } from '@/web/lib/webHighlightExport';
import {
  buildSettingsSearch,
  parseSettingsTab,
  type SettingsTab,
} from '@/web/routing/settingsTab';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'plan', label: 'Plan' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'ai', label: 'Integrations' },
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
  const isPaidActive = resolveWebPaidActive(billing?.snapshot);

  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: entitlement.status,
      }),
    [isAuthenticated, isPaidActive, entitlement.status]
  );

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });
  const { deleteScope } = useWebHighlightDelete({
    highlights: lib.highlights,
    removeHighlights: lib.removeHighlights,
  });

  const [billingActionError, setBillingActionError] = useState<string | null>(null);
  const [deleteLibraryOpen, setDeleteLibraryOpen] = useState(false);
  const [deleteLibraryBusy, setDeleteLibraryBusy] = useState(false);
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
        { replace: true }
      );
    },
    [navigate]
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

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (!caps.flags.export) return;
      exportWebHighlights(lib.highlights, format, { kind: 'library' });
    },
    [caps.flags.export, lib.highlights]
  );

  const handleDataSync = useCallback(() => {
    void lib.refresh();
  }, [lib]);

  const handleConfirmDeleteLibrary = useCallback(async () => {
    if (!isAuthenticated || deleteLibraryBusy || lib.highlights.length === 0) return;
    setDeleteLibraryBusy(true);
    try {
      const result = await deleteScope({ scope: 'library' });
      if (result.success) setDeleteLibraryOpen(false);
    } finally {
      setDeleteLibraryBusy(false);
    }
  }, [deleteLibraryBusy, deleteScope, isAuthenticated, lib.highlights.length]);

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
        <AppearancePanel theme={theme} onThemeChange={(t: ThemeType) => setTheme(t)} />
      );
      break;
    case 'keyboard':
      panel = (
        <div className="settings-panel is-tab-enter" data-od-id="settings-keyboard">
          <h2>Keyboard</h2>
          <p className="lead">Extension shortcuts on pages you highlight.</p>
          <SettingsKeyboardSection />
        </div>
      );
      break;
    case 'ai':
      panel = (
        <AiPanel
          caps={caps}
          isAuthenticated={isAuthenticated}
          userId={user?.id ?? null}
          billingCta={cta}
          onBillingAction={handleBillingAction}
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
          highlightCount={isAuthenticated ? lib.highlights.length : 0}
          onDeleteLibrary={isAuthenticated ? () => setDeleteLibraryOpen(true) : undefined}
          deleteLibraryBusy={deleteLibraryBusy}
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

  const libraryDeleteCopy = deleteLibraryCopy(true);

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
        <nav
          className="settings-nav"
          data-od-id="settings-nav"
          aria-label="Settings sections"
        >
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

      <DeleteConfirmDialog
        open={deleteLibraryOpen}
        onClose={() => {
          if (!deleteLibraryBusy) setDeleteLibraryOpen(false);
        }}
        severity={libraryDeleteCopy.severity}
        title={libraryDeleteCopy.title}
        message="This permanently removes every highlight in your cloud library."
        note={libraryDeleteCopy.note}
        confirmLabel={libraryDeleteCopy.confirmLabel}
        cancelLabel={libraryDeleteCopy.cancelLabel}
        confirmText="DELETE"
        isConfirming={deleteLibraryBusy}
        onConfirm={() => {
          void handleConfirmDeleteLibrary();
        }}
        exportFooter={
          caps.flags.export ? (
            <>
              <button
                type="button"
                className="btn sm"
                data-od-id="settings-delete-export-md"
                disabled={deleteLibraryBusy}
                onClick={() => handleExport('md')}
              >
                Markdown
              </button>
              <button
                type="button"
                className="btn sm"
                data-od-id="settings-delete-export-xlsx"
                disabled={deleteLibraryBusy}
                onClick={() => handleExport('xlsx')}
              >
                Spreadsheet
              </button>
            </>
          ) : undefined
        }
      />
    </div>
  );
}
