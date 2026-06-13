import React from 'react';

import { useApp } from '@/core/context/PopupAppProvider';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';
import { Row } from '@/ui-system/components/primitives/Row';
import { TTLMeter } from '@/ui-system/components/primitives/TTLMeter';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomain';

export interface DashboardViewProps {
  onLogout?: () => void;
}

export function DashboardView({ onLogout: _onLogout }: DashboardViewProps): React.ReactElement {
  const { currentMode, user } = useApp();
  const tabContext = useCurrentTabContext();
  const { data: dashboardData } = useDashboardData(currentMode || 'ephemeral');
  const { highlights: currentDomainHighlights } = useHighlightsByDomain(tabContext.domain || undefined);

  const currentPageHighlightsCount = currentDomainHighlights.filter(h => h.path === tabContext.path).length;
  const currentDomainDisplay = tabContext.domain || 'Current page';
  const currentPathDisplay = tabContext.path && tabContext.path !== '/' ? tabContext.path.split('/')[1] : 'Home';

  if (currentMode === 'ephemeral') {
    const ttlMs = 3.5 * 3600_000 + 22 * 60_000;
    const ttlH = Math.floor(ttlMs / 3600_000);
    const ttlM = Math.floor((ttlMs % 3600_000) / 60_000);
    const ttlLabel = `${ttlH}h ${ttlM}m`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '14px 16px 4px' }}>
          <div className="u-kicker">Ephemeral · expires in</div>
          <div
            className="u-mono"
            style={{
              fontSize: 'var(--step-1)',
              lineHeight: 1.2,
              color: 'var(--ink-2)',
              fontWeight: 500,
              marginTop: 4,
              letterSpacing: '-0.005em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {ttlLabel}
          </div>
          <div style={{ marginTop: 8 }}>
            <TTLMeter ms={ttlMs} />
          </div>
        </div>
        <div style={{ padding: '10px 16px 6px' }}>
          <div className="u-kicker">Current page</div>
          <div className="u-serif" style={{ fontSize: 'var(--step-2)', lineHeight: 1.15, letterSpacing: '-0.01em', marginTop: 4 }}>
            {currentDomainDisplay} / {currentPathDisplay}
          </div>
          <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 4 }}>
            {currentPageHighlightsCount} highlights on this page
          </div>
        </div>
        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
          Recent
        </div>
        <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {dashboardData?.recentHighlights && dashboardData.recentHighlights.length > 0 ? (
            dashboardData.recentHighlights.map(hl => (
              <HighlightCard key={hl.id} quote={hl.text} domain={hl.domain} section={hl.path !== '/' ? hl.path.split('/')[1] : 'Home'} ttlMs={ttlMs} />
            ))
          ) : (
            <div style={{ padding: '16px', color: 'var(--ink-3)' }}>No highlights yet.</div>
          )}
        </div>
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
        <Stat label="Synced" value={currentMode === 'local' ? 'This device' : '4 devices'} mono />
      </div>
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Jump to this page
      </div>
      <Row title={`${currentDomainDisplay} / ${currentPathDisplay}`} sub={`${currentPageHighlightsCount} highlights on this page`} right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>→</span>} onClick={() => {}} />
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Recent
      </div>
      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {dashboardData?.recentHighlights && dashboardData.recentHighlights.length > 0 ? (
          dashboardData.recentHighlights.map(hl => (
            <HighlightCard key={hl.id} quote={hl.text} domain={hl.domain} section={hl.path !== '/' ? hl.path.split('/')[1] : 'Home'} />
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

