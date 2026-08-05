import type { ErrorInfo, ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster, toast } from 'sonner';

import { PopupAppProvider, useApp } from '../../core/context/PopupAppProvider';
import { APIKeySetupView } from '../../features/ai/views/APIKeySetupView';
import { LLMStreamingView } from '../../features/ai/views/LLMStreamingView';
import { AuthProvider, useAuth as useExtensionAuth } from '../../ui-system/providers/AuthProvider';
import { CollectionsView } from '../../features/collections/views/CollectionsView';
import { DomainDetailsView } from '../../features/collections/views/DomainDetailsView';
import { SubDomainView } from '../../features/collections/views/SubDomainView';
import { ModeSelectionView } from '../../features/modes/ModeSelectionView';
import { SettingsPage } from '../../pages/SettingsPage';
import { WelcomePage } from '../../pages/WelcomePage';
import {
  clearPopupDomainSection,
  clearPendingAuthMode,
  loadPopupNavigationSnapshot,
  persistPopupDomain,
  persistPopupSection,
  persistPendingAuthMode,
  persistPopupView,
} from '../../shared/constants/popup-navigation-storage';
import type { PromptContext } from '../../shared/llm/prompts';
import type { ModeType } from '../../shared/schemas/mode-state-schemas';
import type { ProviderName } from '../../shared/interfaces/i-llm-service';
import {
  postLoginViewForMode,
  resolvePopupInitialRoute,
} from '../../shared/popup/resolve-popup-initial-route';
import { PopupShell } from '../../ui-system/components/layout/PopupShell';
import { Spinner } from '../../ui-system/components/primitives/Spinner';

import { buildChrome, type ActiveTab, type ChromeHandlers, type ViewKey } from './chrome';
import { AskView } from './views/AskView';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';

import { ExtensionDataProviderAdapter } from '@/core/data/ExtensionDataProviderAdapter';
import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { resolveAskLockReason } from '@/shared/utils/ask-lock';
import { resolveAccountPillLabel } from '@/shared/utils/account-pill';
import { getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';
import '../../ui-system/theme/global.css';
import './base.css';

enum View {
  LOADING = 'LOADING',
  WELCOME = 'WELCOME',
  MODE_SELECTION = 'MODE_SELECTION',
  COLLECTIONS = 'COLLECTIONS',
  DOMAIN_DETAILS = 'DOMAIN_DETAILS',
  SUB_DOMAIN = 'SUB_DOMAIN',
  AUTH = 'AUTH',
  SETTINGS = 'SETTINGS',
  ASK = 'ASK',
  DASHBOARD = 'DASHBOARD',
  API_KEY_SETUP = 'API_KEY_SETUP',
  LLM_STREAMING = 'LLM_STREAMING',
}

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
        <div style={{ width: 400, height: 600, padding: 16, backgroundColor: 'var(--paper)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 className="u-serif" style={{ fontSize: 22, color: 'var(--accent)', marginBottom: 8 }}>Something went wrong</h2>
          <p className="u-sans" style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn"
          >
            Reload Extension
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function PopupApp(): React.ReactElement {
  const { user, logout, isLoading, setMode, currentMode } = useApp(); // Use from context now!
  const { verificationStatus } = useExtensionAuth();
  const billing = useBillingContextOptional();
  // Auth sync is now handled by PopupAppProvider via props

  const [currentView, setCurrentView] = useState<View>(View.LOADING);
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  /** Library domain chat icon → Ask tab with this hostname. */
  const [askLibraryDomain, setAskLibraryDomain] = useState<string | null>(null);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [pendingMode, setPendingMode] = useState<ModeType | null>(null);
  const [prevUser, setPrevUser] = useState<typeof user | undefined>(undefined);
  const [llmContext, setLlmContext] = useState<PromptContext | null>(null);
  const [lastLlmSetupProvider, setLastLlmSetupProvider] = useState<ProviderName | undefined>();

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

  // Initialization
  useEffect(() => {
    if (isLoading) return;

    async function initStorage(): Promise<void> {
      try {
        const [onboarding, nav] = await Promise.all([
          browser.storage.local.get([
            'underscore_seen_welcome',
            'underscore_seen_mode_selection',
          ]),
          loadPopupNavigationSnapshot(),
        ]);
        const hasSeenWelcome = onboarding['underscore_seen_welcome'] === 'true';
        const hasSeenModeSelection = onboarding['underscore_seen_mode_selection'] === 'true';

        if (nav.lastLlmSetupProvider) {
          setLastLlmSetupProvider(nav.lastLlmSetupProvider);
        }

        const resolved = resolvePopupInitialRoute({
          isAuthenticated: Boolean(user),
          onboarding: { hasSeenWelcome, hasSeenModeSelection },
          nav,
          currentMode,
          verificationStatus,
        });

        if (resolved.applyMode) {
          setMode(resolved.applyMode);
          setPendingMode(null);
          if (resolved.consumePendingAuthMode) {
            await clearPendingAuthMode();
          }
        } else if (nav.pendingAuthMode) {
          setPendingMode(nav.pendingAuthMode as ModeType);
        }

        if (resolved.selectedDomain) {
          setSelectedDomain(resolved.selectedDomain);
        }
        if (resolved.selectedSection) {
          setSelectedSection(resolved.selectedSection);
        }

        setCurrentView(resolved.view as View);
      } catch (err) {
        console.error('Storage load failed', err);
        setCurrentView(View.WELCOME);
      } finally {
        setIsStorageReady(true);
      }
    }

    initStorage();
  }, [isLoading]);

  // Persist view state so reopening the popup restores the last screen (not auth gates).
  useEffect(() => {
    if (!isStorageReady) return;
    void persistPopupView(currentView).catch(console.error);
  }, [currentView, isStorageReady]);

  const handleStartWelcome = async (): Promise<void> => {
    await browser.storage.local.set({ underscore_seen_welcome: 'true' });
    setCurrentView(View.MODE_SELECTION);
  };

  const handleModeSelect = async (modeId: string): Promise<void> => {
    // Mark mode selection as seen
    await browser.storage.local.set({ underscore_seen_mode_selection: 'true' });

    // Update global mode state
    setMode(modeId as ModeType);

    // Note: Mode gets set via contexts/hooks within the view or globally
    setCurrentView(View.COLLECTIONS);
  };

  const handleSignInClick = async (modeId: ModeType): Promise<void> => {
    setPendingMode(modeId);
    await browser.storage.local.set({ underscore_seen_mode_selection: 'true' });
    await persistPendingAuthMode(modeId);
    setCurrentView(View.AUTH);
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
    await persistPopupView('MODE_SELECTION');
    setSelectedDomain('');
    setSelectedSection('');
    setPendingMode(null);
    setCurrentView(View.MODE_SELECTION);
  };

  const handleBackToModeSelection = (): void => {
    setCurrentView(View.MODE_SELECTION);
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

  const handleSettingsClick = (): void => {
    setPreviousView(currentView);
    setCurrentView(View.SETTINGS);
  };

  const handleSettingsChangeMode = (): void => {
    setPreviousView(currentView);
    setCurrentView(View.MODE_SELECTION);
  };

  const handleModeSelectionBack = (): void => {
    if (previousView && previousView !== View.MODE_SELECTION) {
      setCurrentView(previousView);
      setPreviousView(null);
    } else {
      setCurrentView(View.COLLECTIONS);
    }
  };

  const handleTabChange = (tab: ActiveTab): void => {
    switch (tab) {
      case 'home':
        setAskLibraryDomain(null);
        setCurrentView(View.DASHBOARD);
        break;
      case 'collections':
        setAskLibraryDomain(null);
        setCurrentView(View.COLLECTIONS);
        break;
      case 'ask':
        setCurrentView(View.ASK);
        break;
      case 'settings':    handleSettingsClick(); break;
    }
  };

  const handleConfigureAIProviders = (): void => {
    setPreviousView(currentView);
    setCurrentView(View.API_KEY_SETUP);
  };

  const handleBackFromApiKeySetup = (): void => {
    setCurrentView(View.SETTINGS);
  };

  const handleBackFromLlmStreaming = (): void => {
    setLlmContext(null);
    setCurrentView(previousView ?? View.COLLECTIONS);
    setPreviousView(null);
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
  const { provider: activeLlmProvider } = useActiveLLMProvider();
  const aiCapability = getCapabilitiesForMode(modeId as ModeType).ai;
  const askLockReason = resolveAskLockReason({
    isAuthenticated: Boolean(user),
    isPaidActive,
    billingStatus,
    hasModel: activeLlmProvider !== null,
    aiCapability,
  });

  const chromeHandlers: ChromeHandlers = {
    onTabChange: handleTabChange,
    onSwitch: handleSettingsChangeMode,
    onBackToCollections: handleBackToCollections,
    onBackToDomain: handleBackToDomain,
    onBackFromApiKeySetup: handleBackFromApiKeySetup,
    onBackFromLlmStreaming: handleBackFromLlmStreaming,
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
  };
  const chrome = buildChrome(chromeHandlers);

  if (currentView === View.LOADING || !isStorageReady) {
    return (
      <PopupShell chrome={chrome[View.LOADING]} viewKey={View.LOADING}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size="lg" />
        </div>
      </PopupShell>
    );
  }

  // Body-only views: PopupShell owns the sole AnimatePresence + motion.div
  // (and reduced-motion gating). No per-view motion wrappers.
  return (
    <PopupShell chrome={chrome[currentView as ViewKey]} viewKey={currentView}>
      {currentView === View.WELCOME && (
        <WelcomePage onStartClick={handleStartWelcome} />
      )}
      {currentView === View.MODE_SELECTION && (
        <ModeSelectionView
          onModeSelect={handleModeSelect}
          onSignInClick={handleSignInClick}
          onBack={previousView ? handleModeSelectionBack : undefined}
          onNavigateToCollections={() => setCurrentView(View.COLLECTIONS)}
          initialMode={currentMode}
          isAuthenticated={!!user}
        />
      )}
      {currentView === View.COLLECTIONS && (
        <CollectionsView
          onCollectionClick={handleCollectionClick}
          onSectionClick={handleSectionClick}
          onAskDomain={(domain) => {
            setAskLibraryDomain(domain);
            setCurrentView(View.ASK);
          }}
          isAuthenticated={!!user}
          onSignIn={() => setCurrentView(View.AUTH)}
        />
      )}
      {currentView === View.DOMAIN_DETAILS && (
        <DomainDetailsView
          domain={selectedDomain}
          onBack={handleBackToCollections}
          onSectionClick={handleSectionClick}
          onAskDomain={(domain) => {
            setAskLibraryDomain(domain);
            setCurrentView(View.ASK);
          }}
        />
      )}
      {currentView === View.SUB_DOMAIN && (
        <SubDomainView
          domain={selectedDomain}
          section={selectedSection}
          onBack={handleBackToDomain}
          onDomainEmpty={handleBackToCollections}
        />
      )}
      {currentView === View.AUTH && (
        <AuthView
          onLoginSuccess={handleLoginSuccess}
          onBackToModeSelection={handleBackToModeSelection}
        />
      )}
      {currentView === View.SETTINGS && (
        <SettingsPage
          onBack={handleBackToCollections}
          onChangeMode={handleSettingsChangeMode}
          onConfigureAIProviders={handleConfigureAIProviders}
          onSignIn={() => setCurrentView(View.AUTH)}
          onLogout={handleLogout}
        />
      )}
      {currentView === View.ASK && (
        <AskView
          lockReason={askLockReason}
          libraryDomain={askLibraryDomain}
          onSignIn={() => setCurrentView(View.AUTH)}
          onUpgrade={() => {
            if (billing?.startCheckout) {
              void billing.startCheckout().catch(() => {
                setCurrentView(View.SETTINGS);
              });
              return;
            }
            setCurrentView(View.SETTINGS);
          }}
          onUpdatePayment={() => {
            if (billing?.openPortal) {
              void billing.openPortal().catch(() => {
                setCurrentView(View.SETTINGS);
              });
              return;
            }
            setCurrentView(View.SETTINGS);
          }}
          onConnectAi={handleConfigureAIProviders}
        />
      )}
      {currentView === View.DASHBOARD && (
        <DashboardView
          onLogout={handleLogout}
          onSectionClick={handleSectionClick}
          onSignIn={() => setCurrentView(View.AUTH)}
          isPaidActive={isPaidActive}
          onAskPage={() => {
            setAskLibraryDomain(null);
            setCurrentView(View.ASK);
          }}
        />
      )}
      {currentView === View.API_KEY_SETUP && (
        <APIKeySetupView
          initialProvider={lastLlmSetupProvider}
          onClose={handleBackFromApiKeySetup}
        />
      )}
      {currentView === View.LLM_STREAMING && llmContext && (
        <LLMStreamingView ctx={llmContext} onClose={handleBackFromLlmStreaming} />
      )}
    </PopupShell>
  );
}

const popupEventBus = new EventBus(new ConsoleLogger('PopupData', LogLevel.WARN));
const popupMessageBus = new ChromeMessageBus(new ConsoleLogger('PopupMessageBus', LogLevel.WARN), {
  timeoutMs: 120_000,
});
const popupDataProvider = new ExtensionDataProviderAdapter(popupEventBus, popupMessageBus);

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
      <div style={{ width: 400, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--paper)' }}>
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
