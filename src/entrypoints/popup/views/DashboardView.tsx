import React from 'react';

import { useApp } from '@/core/context/PopupAppProvider';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';
import { Row } from '@/ui-system/components/primitives/Row';
import { TTLMeter } from '@/ui-system/components/primitives/TTLMeter';

/**
 * DashboardView — V2 Editorial migration.
 *
 * Body-only root: `display: flex, flex-direction: column, height: 100%, width: 100%`.
 * PopupShell owns the 400x600 chrome; this view returns body content only.
 *
 * V2 token map applied:
 *   - fontSize: 9, 10   -> var(--step--2)
 *   - fontSize: 15      -> var(--step-1)
 *   - fontSize: 19      -> var(--step-2)
 *   - fontSize: 22      -> var(--step-3)
 *
 * Behavior preserved: ephemeral branch (3.5*3600_000 + 22*60_000 TTL, mock anthropic.com data),
 * 3 HighlightCard mocks, Stat grid (1fr 1fr), Row navigation, _onLogout still accepted.
 */
export interface DashboardViewProps {
  onLogout?: () => void;
}

export function DashboardView({ onLogout: _onLogout }: DashboardViewProps): React.ReactElement {
  const { currentMode, user } = useApp();

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
            anthropic.com / Academy
          </div>
          <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 4 }}>
            3 highlights on this page
          </div>
        </div>
        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
          Recent
        </div>
        <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section="Academy" ttlMs={18 * 3600_000} />
          <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section="Academy" ttlMs={9 * 3600_000} />
          <HighlightCard quote="Constitutional methods aim for principles, not rules." domain="anthropic.com" section="Academy" ttlMs={3.5 * 3600_000} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '14px 16px 8px' }}>
        <div className="u-kicker">Good morning{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</div>
        <div className="u-serif" style={{ fontSize: 'var(--step-3)', lineHeight: 1.1, letterSpacing: '-0.02em', marginTop: 6 }}>
          51 highlights across 4 domains.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--rule)' }}>
        <Stat label="This week" value="12" />
        <Stat label="Synced" value={currentMode === 'local' ? 'This device' : '4 devices'} mono />
      </div>
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Jump to this page
      </div>
      <Row title="anthropic.com / Academy" sub="3 highlights on this page" right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>→</span>} onClick={() => {}} />
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Recent
      </div>
      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section="Academy" />
        <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section="Academy" />
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
