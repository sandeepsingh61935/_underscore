import type { ErrorInfo, ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster, toast } from 'sonner';

import { PopupAppProvider, useApp } from '../../core/context/PopupAppProvider';
import type { OpenedHighlight } from '@/features/collections/opened-highlight';
import { SettingsPage } from '../../pages/SettingsPage';
import { WelcomePage } from '../../pages/WelcomePage';
import {
  clearPopupDomainSection,
  clearPendingAuthMode,
  loadPopupNavigationSnapshot,
  loadSyncPopupNavigationSnapshot,
  persistPopupDomain,
  persistPopupSection,
  persistPopupView,
} from '../../shared/constants/popup-navigation-storage';
import {
  postLoginViewForMode,
  resolvePopupInitialRoute,
} from '../../shared/popup/resolve-popup-initial-route';
import type { ModeType } from '../../shared/schemas/mode-state-schemas';
import { PopupShell } from '../../ui-system/components/layout/PopupShell';
import { Button, Spinner } from '@/ui-system/components/primitives';
import {
  AuthProvider,
  useAuth as useExtensionAuth,
} from '../../ui-system/providers/AuthProvider';

import { buildChrome, type ActiveTab, type ChromeHandlers, type ViewKey } from './chrome';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';

import { ExtensionDataProviderAdapter } from '@/core/data/ExtensionDataProviderAdapter';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { UploadFromDeviceDialog } from '@/features/settings/components/UploadFromDeviceDialog';
import { useDeviceUploadPrompt } from '@/features/settings/hooks/use-device-upload-prompt';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { resolveAccountPillLabel } from '@/shared/utils/account-pill';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel, LoggerFactory } from '@/shared/utils/logger';
import '../../ui-system/theme/global.css';
import './base.css';

// Production consoles are user-readable: warnings and errors only.
if (import.meta.env.PROD) {
  LoggerFactory.setGlobalLevel(LogLevel.WARN);
}

// Lazy collection views: keeps initial popup parse off the critical path (Q9).
// Dashboard/Settings stay eager (default sync-seed targets).
const CollectionsView = React.lazy(() =>
  import('../../features/collections/views/CollectionsView').then((m) => ({
    default: m.CollectionsView,
  }))
);
const DomainDetailsView = React.lazy(() =>
  import('../../features/collections/views/DomainDetailsView').then((m) => ({
    default: m.DomainDetailsView,
  }))
);
const SubDomainView = React.lazy(() =>
  import('../../features/collections/views/SubDomainView').then((m) => ({
    default: m.SubDomainView,
  }))
);
const HighlightQuoteView = React.lazy(() =>
  import('@/features/collections/views/HighlightQuoteView').then((m) => ({
    default: m.HighlightQuoteView,
  }))
);

function ViewSkeleton(): React.ReactElement {
  return (
    <div style={{ padding: '8px 0' }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 56,
            margin: '0 16px 8px',
            border: '1px solid var(--rule-soft)',
            background: 'var(--paper-2)',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

enum View {
  LOADING = 'LOADING',
  WELCOME = 'WELCOME',
  COLLECTIONS = 'COLLECTIONS',
  DOMAIN_DETAILS = 'DOMAIN_DETAILS',
  SUB_DOMAIN = 'SUB_DOMAIN',
  HIGHLIGHT = 'HIGHLIGHT',
  AUTH = 'AUTH',
  SETTINGS = 'SETTINGS',
  DASHBOARD = 'DASHBOARD',
}

/** Instant swap — no animation to avoid chrome/body desync (Q1). */
const MOTION_STYLE = {
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  pointerEvents: 'auto' as const,
  backgroundColor: 'var(--paper)',
};

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): {
    hasError: boolean;
    error: Error | null;
  } {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Popup Error:', error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: 400,
            height: 600,
            padding: 16,
            backgroundColor: 'var(--paper)',
            color: 'var(--ink)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <h2
            className="u-serif"
            style={{ fontSize: 22, color: 'var(--accent)', marginBottom: 8 }}
          >
            Something went wrong
          </h2>
          <p
            className="u-sans"
            style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}
          >
            {this.state.error?.message || 'Unknown error'}
          </p>
          <Button
            type="button"
            variant="default"
            size="default"
            onClick={() => {
              void clearPopupDomainSection().catch(() => {});
              try {
                window.localStorage.removeItem('underscore_last_popup_view');
                window.localStorage.removeItem('underscore_last_selected_domain');
                window.localStorage.removeItem('underscore_last_selected_section');
              } catch {
                // ignore
              }
              window.location.reload();
            }}
          >
            Reload Extension
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function getInitialPopupState(
  isAuthenticated: boolean,
  currentMode: ModeType,
  verificationStatus?: 'idle' | 'awaiting' | 'failed'
): {
  view: View;
  selectedDomain: string;
  selectedSection: string;
  pendingMode: ModeType | null;
} {
  try {
    const nav = loadSyncPopupNavigationSnapshot();
    const hasSeenWelcome =
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('underscore_seen_welcome') === 'true';
    const effectiveSeenWelcome = hasSeenWelcome || Boolean(nav.lastView);
    const resolved = resolvePopupInitialRoute({
      isAuthenticated,
      onboarding: { hasSeenWelcome: effectiveSeenWelcome },
      nav,
      currentMode,
      verificationStatus,
    });
    return {
      view: (resolved.view as View) || View.DASHBOARD,
      selectedDomain: resolved.selectedDomain || '',
      selectedSection: resolved.selectedSection || '',
      pendingMode: nav.pendingAuthMode ? (nav.pendingAuthMode as ModeType) : null,
    };
  } catch {
    return {
      view: View.DASHBOARD,
      selectedDomain: '',
      selectedSection: '',
      pendingMode: null,
    };
  }
}

function PopupApp(): React.ReactElement {
  const { user, logout, isLoading, setMode, currentMode } = useApp();
  const deviceUploadPrompt = useDeviceUploadPrompt(Boolean(user));
  const { verificationStatus } = useExtensionAuth();
  const billing = useBillingContextOptional();

  const initial = React.useMemo(
    () => getInitialPopupState(Boolean(user), currentMode, verificationStatus),
    []
  );
  const [currentView, setCurrentView] = useState<View>(initial.view);
  const [selectedDomain, setSelectedDomain] = useState<string>(initial.selectedDomain);
  const [selectedSection, setSelectedSection] = useState<string>(initial.selectedSection);
  const [openedHighlight, setOpenedHighlight] = useState<OpenedHighlight | null>(null);
  const [highlightReturn, setHighlightReturn] = useState<View>(View.SUB_DOMAIN);
  const [isStorageReady, setIsStorageReady] = useState(true);
  const [pendingMode, setPendingMode] = useState<ModeType | null>(initial.pendingMode);
  const [prevUser, setPrevUser] = useState<typeof user | undefined>(undefined);

  // Authentication & Mode Notification / Swapping Effect
  useEffect(() => {
    if (isLoading || !isStorageReady) return;

    if (prevUser !== undefined) {
      if (user && !prevUser) {
        const name = user.displayName || user.email || 'User';
        toast.success(`Welcome, ${name}!`);
      } else if (!user && prevUser) {
        toast.success('Signed out · Switched to Guest mode');
        setMode('basic');
        if (currentView === View.DOMAIN_DETAILS || currentView === View.SUB_DOMAIN) {
          setCurrentView(View.DASHBOARD);
        }
      }
    }
    setPrevUser(user);
  }, [user, prevUser, isLoading, isStorageReady, setMode, currentView]);

  // Auth gate: OAuth often completes in background while popup is closed.
  // If we reopen on AUTH (or auth completes while still on AUTH), route forward.
  useEffect(() => {
    if (!isStorageReady || isLoading || !user || currentView !== View.AUTH) {
      return;
    }

    const completeAuthNavigation = async (): Promise<void> => {
      const nav = await loadPopupNavigationSnapshot();
      const storedPending = nav.pendingAuthMode as ModeType | undefined;
      const targetMode = pendingMode ?? storedPending ?? currentMode;

      if (pendingMode || storedPending) {
        setMode(targetMode);
        setPendingMode(null);
        await clearPendingAuthMode();
      }

      setCurrentView(postLoginViewForMode(targetMode) as View);
    };

    void completeAuthNavigation();
  }, [user, currentView, isStorageReady, isLoading, pendingMode, currentMode, setMode]);

  // Initialization & background reconciliation (instant, no LOADING flash)
  useEffect(() => {
    async function initStorage(): Promise<void> {
      try {
        const [onboarding, nav] = await Promise.all([
          browser.storage.local.get(['underscore_seen_welcome']),
          loadPopupNavigationSnapshot(),
        ]);
        const hasSeenWelcome = onboarding['underscore_seen_welcome'] === 'true';
        if (hasSeenWelcome && typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem('underscore_seen_welcome', 'true');
          } catch {
            // ignore
          }
        }
        const resolved = resolvePopupInitialRoute({
          isAuthenticated: Boolean(user),
          onboarding: { hasSeenWelcome },
          nav,
          currentMode,
          verificationStatus,
        });
        if (resolved.applyMode) {
          setMode(resolved.applyMode);
          setPendingMode(null);
          if (resolved.consumePendingAuthMode) await clearPendingAuthMode();
        } else if (nav.pendingAuthMode) {
          setPendingMode(nav.pendingAuthMode as ModeType);
        }
        if (resolved.selectedDomain) setSelectedDomain(resolved.selectedDomain);
        if (resolved.selectedSection) setSelectedSection(resolved.selectedSection);
        setCurrentView((prev) => {
          const next = resolved.view as View;
          return prev === initial.view ? next : prev;
        });
      } catch (err) {
        console.error('Storage load failed', err);
      } finally {
        setIsStorageReady(true);
      }
    }
    void initStorage();
  }, []);

  // Persist view state so reopening the popup restores the last screen (not auth gates).
  useEffect(() => {
    if (!isStorageReady) return;
    void persistPopupView(currentView).catch(console.error);
  }, [currentView, isStorageReady]);

  const handleStartWelcome = async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('underscore_seen_welcome', 'true');
      }
    } catch {
      // ignore
    }
    await browser.storage.local.set({ underscore_seen_welcome: 'true' });
    setMode('basic');
    setCurrentView(View.COLLECTIONS);
  };

  const handleLoginSuccess = async (): Promise<void> => {
    const targetMode = pendingMode || 'pro';
    setMode(targetMode);
    setPendingMode(null);
    await clearPendingAuthMode();
    setCurrentView(View.COLLECTIONS);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    await clearPendingAuthMode();
    await clearPopupDomainSection();
    await persistPopupView('COLLECTIONS');
    setSelectedDomain('');
    setSelectedSection('');
    setPendingMode(null);
    setCurrentView(View.COLLECTIONS);
  };

  const handleCollectionClick = (domain: string): void => {
    setSelectedDomain(domain);
    void persistPopupDomain(domain).catch(console.error);
    setCurrentView(View.DOMAIN_DETAILS);
  };

  const handleBackToCollections = (): void => {
    void clearPopupDomainSection().catch(console.error);
    setCurrentView(View.COLLECTIONS);
  };

  const handleSectionClick = (domain: string, section: string): void => {
    setSelectedDomain(domain);
    setSelectedSection(section);
    void persistPopupDomain(domain).catch(console.error);
    void persistPopupSection(section).catch(console.error);
    setCurrentView(View.SUB_DOMAIN);
  };

  const handleBackToDomain = (): void => {
    setCurrentView(View.DOMAIN_DETAILS);
  };

  const handleOpenHighlight = (highlight: OpenedHighlight): void => {
    setOpenedHighlight(highlight);
    setHighlightReturn(currentView);
    setSelectedDomain(highlight.domain);
    if (highlight.path) setSelectedSection(highlight.path);
    setCurrentView(View.HIGHLIGHT);
  };

  const handleBackFromHighlight = (): void => {
    setOpenedHighlight(null);
    setCurrentView(highlightReturn);
  };

  const handleOpenRelatedSection = (domain: string, section: string): void => {
    setOpenedHighlight(null);
    setSelectedDomain(domain);
    setSelectedSection(section);
    setCurrentView(View.SUB_DOMAIN);
  };

  const handleSettingsClick = (): void => {
    setCurrentView(View.SETTINGS);
  };

  const handleSettingsChangeMode = (): void => {
    // Mode selection page removed — settings "change mode" now goes to Collections
    setCurrentView(View.COLLECTIONS);
  };

  const handleTabChange = (tab: ActiveTab): void => {
    switch (tab) {
      case 'home':
        setCurrentView(View.DASHBOARD);
        break;
      case 'collections':
        setCurrentView(View.COLLECTIONS);
        break;
      case 'settings':
        handleSettingsClick();
        break;
    }
  };

  const modeId = typeof currentMode === 'string' ? currentMode : 'basic';
  const billingReady = billing?.snapshot.loadState === 'ready';
  // Match SettingsPage: while billing loads, avoid flashing Free for known paid modes.
  const isPaidActive = billing
    ? billingReady
      ? billing.snapshot.isPaidActive
      : modeId === 'pro_xai' || billing.snapshot.isPaidActive
    : modeId === 'pro_xai';
  const billingStatus = billing?.snapshot.entitlement.status ?? null;
  const chromeHandlers: ChromeHandlers = React.useMemo(
    () => ({
      onTabChange: handleTabChange,
      onSwitch: handleSettingsChangeMode,
      onBackToCollections: handleBackToCollections,
      onBackToDomain: handleBackToDomain,
      onBackToHighlight: handleBackFromHighlight,
      highlightBackLabel: () => openedHighlight?.domain || 'Library',
      subDomainBackLabel: () => selectedDomain,
      getModeId: () => modeId,
      getAccountPill: () =>
        resolveAccountPillLabel({
          modeId,
          isAuthenticated: Boolean(user),
          isPaidActive,
          billingStatus,
        }),
      onAccountPillClick: handleSettingsClick,
    }),
    [
      handleTabChange,
      handleSettingsChangeMode,
      handleBackToCollections,
      handleBackToDomain,
      handleBackFromHighlight,
      openedHighlight?.domain,
      selectedDomain,
      modeId,
      isPaidActive,
      billingStatus,
      user,
    ]
  );
  const chrome = React.useMemo(() => buildChrome(chromeHandlers), [chromeHandlers]);

  if (currentView === View.LOADING || !isStorageReady) {
    return (
      <PopupShell chrome={chrome[View.LOADING]}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinner size="lg" />
        </div>
      </PopupShell>
    );
  }

  let viewContent: React.ReactNode = null;
  switch (currentView) {
    case View.WELCOME:
      viewContent = <WelcomePage onStartClick={handleStartWelcome} />;
      break;
    case View.COLLECTIONS:
      viewContent = (
        <CollectionsView
          onCollectionClick={handleCollectionClick}
          onSectionClick={handleSectionClick}
          onOpenHighlight={handleOpenHighlight}
          isAuthenticated={!!user}
          onSignIn={() => setCurrentView(View.AUTH)}
        />
      );
      break;
    case View.DOMAIN_DETAILS:
      viewContent = (
        <DomainDetailsView
          domain={selectedDomain}
          onBack={handleBackToCollections}
          onSectionClick={handleSectionClick}
          onOpenHighlight={handleOpenHighlight}
        />
      );
      break;
    case View.SUB_DOMAIN:
      viewContent = (
        <SubDomainView
          domain={selectedDomain}
          section={selectedSection}
          onBack={handleBackToDomain}
          onDomainEmpty={handleBackToCollections}
          onOpenHighlight={handleOpenHighlight}
        />
      );
      break;
    case View.HIGHLIGHT:
      viewContent = openedHighlight ? (
        <HighlightQuoteView
          highlight={openedHighlight}
          onOpenSection={handleOpenRelatedSection}
        />
      ) : null;
      break;
    case View.AUTH:
      viewContent = (
        <AuthView
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setCurrentView(View.COLLECTIONS)}
        />
      );
      break;
    case View.SETTINGS:
      viewContent = (
        <SettingsPage
          onBack={handleBackToCollections}
          onChangeMode={handleSettingsChangeMode}
          onSignIn={() => setCurrentView(View.AUTH)}
          onLogout={handleLogout}
        />
      );
      break;
    case View.DASHBOARD:
      viewContent = (
        <DashboardView
          onLogout={handleLogout}
          onSectionClick={handleSectionClick}
          onSignIn={() => setCurrentView(View.AUTH)}
        />
      );
      break;
    default:
      viewContent = null;
      break;
  }

  return (
    <PopupShell chrome={chrome[currentView as ViewKey]}>
      <div key={currentView} style={MOTION_STYLE}>
        <React.Suspense fallback={<ViewSkeleton />}>{viewContent}</React.Suspense>
      </div>
      <UploadFromDeviceDialog
        open={deviceUploadPrompt.open}
        email={deviceUploadPrompt.email}
        pendingCount={deviceUploadPrompt.pendingCount}
        isUploading={deviceUploadPrompt.isUploading}
        error={deviceUploadPrompt.error}
        onClose={deviceUploadPrompt.dismiss}
        onConfirm={() => {
          void deviceUploadPrompt.confirm();
        }}
      />
    </PopupShell>
  );
}

const popupEventBus = new EventBus(new ConsoleLogger('PopupData', LogLevel.WARN));
const popupMessageBus = new ChromeMessageBus(
  new ConsoleLogger('PopupMessageBus', LogLevel.WARN),
  {
    timeoutMs: 120_000,
  }
);
const popupDataProvider = new ExtensionDataProviderAdapter(
  popupEventBus,
  popupMessageBus
);

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <MessageBusProvider messageBus={popupMessageBus}>
          <MemoryRouter>
            <PopupAppWithProviders />
          </MemoryRouter>
        </MessageBusProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('Failed to find #app container');
}

function PopupAppWithProviders(): React.ReactElement {
  return (
    <AuthProvider>
      <PopupAppAuthBridge />
    </AuthProvider>
  );
}

function PopupAppAuthBridge(): React.ReactElement {
  const { user, isLoading, logout } = useExtensionAuth();

  if (isLoading) {
    return (
      <div
        style={{
          width: 400,
          height: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--paper)',
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PopupAppProvider
      user={
        user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.displayName || 'User',
              photoUrl: user.photoUrl,
              // provider field removed as it does not exist on User interface
            }
          : null
      }
      isAuthenticated={!!user}
      onLogout={logout}
      dataProvider={popupDataProvider}
    >
      <PopupApp />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--paper-2)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
            fontFamily: 'var(--sans)',
            fontSize: '13px',
            borderRadius: 'var(--radius)',
          },
        }}
      />
    </PopupAppProvider>
  );
}
