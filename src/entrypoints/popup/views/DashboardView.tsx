import React, { useMemo } from 'react';

import { useApp } from '@/core/context/PopupAppProvider';
import { copyHighlightPlainText } from '@/features/collections/hooks/useHighlightExport';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';
import { Row } from '@/ui-system/components/primitives/Row';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import { resolveLibraryAccess } from '@/shared/utils/mode-capabilities';
import { getSectionKey } from '@/shared/utils/section-key';
import { FirstRunEmpty } from '@/ui-system/components/empty-states/FirstRunEmpty';

export interface DashboardViewProps {
  onLogout?: () => void;
  /** Open domain section (popup view state — not React Router). */
  onSectionClick?: (domain: string, section: string) => void;
  onSignIn?: () => void;
}

export function DashboardView({ onLogout: _onLogout, onSectionClick, onSignIn }: DashboardViewProps): React.ReactElement {
  const { currentMode, user, isAuthenticated } = useApp();
  const tabContext = useCurrentTabContext();
  const mode = currentMode || DEFAULT_MODE;
  const { data: dashboardData } = useDashboardData(mode, isAuthenticated);
  const { highlights: currentDomainHighlights } = useHighlightsByDomain(
    tabContext.domain || undefined,
    isAuthenticated,
  );

  const currentSectionKey = useMemo(() => {
    if (!tabContext.url && !tabContext.path) return '/';
    return getSectionKey({
      url: tabContext.url ?? `https://${tabContext.domain ?? 'local'}${tabContext.path ?? '/'}`,
      path: tabContext.path ?? '/',
    });
  }, [tabContext.url, tabContext.path, tabContext.domain]);

  const currentPageHighlightsCount = useMemo(() => {
    return currentDomainHighlights.filter((h) => {
      const key = getSectionKey({ url: h.url, path: h.path });
      return key === currentSectionKey;
    }).length;
  }, [currentDomainHighlights, currentSectionKey]);

  const currentDomainDisplay = tabContext.domain || 'Current page';
  const currentPathDisplay = tabContext.path && tabContext.path !== '/' ? tabContext.path.split('/')[1] : 'Home';

  const openCurrentPage = (): void => {
    if (!tabContext.domain || !onSectionClick) return;
    onSectionClick(tabContext.domain, currentSectionKey);
  };

  const isGuestHome = !isAuthenticated || currentMode === 'basic';
  const libraryAccess = resolveLibraryAccess(
    isAuthenticated,
    dashboardData?.totalHighlights ?? 0,
  );
  const showCurrentPageBlock =
    currentPageHighlightsCount > 0 || !libraryAccess.showSignInPrompt;

  if (isGuestHome) {
    const recentHighlights = dashboardData?.recentHighlights ?? [];
    const showEmpty = recentHighlights.length === 0 && !libraryAccess.showSignInPrompt;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '14px 16px 4px' }}>
          <div className="u-kicker" style={{ color: 'var(--ink-3)' }}>Guest</div>
        </div>
        {showCurrentPageBlock && (
          <div style={{ padding: '6px 0 0' }}>
            <div className="u-caps" style={{ padding: '4px 16px 4px', color: 'var(--ink-3)' }}>
              Current page
            </div>
            <Row
              title={`${currentDomainDisplay} / ${currentPathDisplay}`}
              sub={`${currentPageHighlightsCount} highlights on this page`}
              right={
                tabContext.domain && onSectionClick ? (
                  <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>→</span>
                ) : undefined
              }
              onClick={tabContext.domain && onSectionClick ? openCurrentPage : undefined}
            />
          </div>
        )}
        {libraryAccess.showSignInPrompt ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <FirstRunEmpty />
            {onSignIn && (
              <div style={{ padding: '0 22px 16px' }}>
                <button type="button" className="btn accent sm" onClick={onSignIn}>
                  Sign in for cloud sync
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
              Recent
            </div>
            <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {showEmpty ? (
                <FirstRunEmpty />
              ) : (
                recentHighlights.map(hl => (
                  <HighlightCard
                    key={hl.id}
                    quote={hl.text}
                    domain={hl.domain}
                    section={!hl.path || hl.path === '/' ? undefined : hl.path}
                    sourceKind={hl.sourceKind}
                    language={hl.language}
                    presentation={hl.presentation}
                    onCopy={hl.text ? () => { void copyHighlightPlainText(hl.text); } : undefined}
                    onSectionClick={
                      onSectionClick
                        ? () => onSectionClick(hl.domain, getSectionKey({ url: hl.url, path: hl.path || '/' }))
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '14px 16px 8px' }}>
        <div className="u-kicker">Good morning{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</div>
        <div className="u-serif" style={{ fontSize: 'var(--step-3)', lineHeight: 1.1, letterSpacing: '-0.02em', marginTop: 6 }}>
          {dashboardData ? `${dashboardData.totalHighlights} highlights across ${dashboardData.totalDomains} domains.` : 'Loading...'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--rule)' }}>
        <Stat label="This week" value={dashboardData ? String(dashboardData.thisWeekCount) : '-'} />
        <Stat label="Domains" value={dashboardData ? String(dashboardData.totalDomains) : '-'} mono />
      </div>
      {currentPageHighlightsCount > 0 && (
        <>
          <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
            Current Page
          </div>
          <Row
            title={`${currentDomainDisplay} / ${currentPathDisplay}`}
            sub={`${currentPageHighlightsCount} highlights on this page`}
            right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>→</span>}
            onClick={openCurrentPage}
          />
        </>
      )}
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Recent
      </div>
      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {dashboardData?.recentHighlights && dashboardData.recentHighlights.length > 0 ? (
          dashboardData.recentHighlights.map(hl => (
            <HighlightCard
              key={hl.id}
              quote={hl.text}
              domain={hl.domain}
              section={!hl.path || hl.path === '/' ? undefined : hl.path}
              sourceKind={hl.sourceKind}
              language={hl.language}
              presentation={hl.presentation}
              onCopy={hl.text ? () => { void copyHighlightPlainText(hl.text); } : undefined}
              onSectionClick={
                onSectionClick
                  ? () => onSectionClick(hl.domain, getSectionKey({ url: hl.url, path: hl.path || '/' }))
                  : undefined
              }
            />
          ))
        ) : (
          <div style={{ padding: '16px', color: 'var(--ink-3)' }}>No recent highlights.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <div style={{ padding: '12px 16px', borderRight: '1px solid var(--rule-soft)' }}>
      <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{label}</div>
      <div className={mono ? 'u-mono' : 'u-serif'} style={{ fontSize: mono ? 'var(--step-1)' : 'var(--step-3)', marginTop: 2, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}
