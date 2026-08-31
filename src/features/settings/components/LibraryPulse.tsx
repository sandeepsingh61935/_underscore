/**
 * Library stats — Settings disclosure (parity with Typography expand).
 * Collapsed: one row (title + quiet summary). Expanded: practice grid.
 * Not shown on Home.
 */
import React from 'react';

export interface LibraryPulseProps {
  totalHighlights: number;
  thisWeekCount: number;
  todayCount: number;
  totalDomains: number;
  withNotesCount: number;
  withTagsCount: number;
  loading?: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function PulseCell({
  label,
  value,
  lastInRow,
}: {
  label: string;
  value: string;
  lastInRow?: boolean;
}): React.ReactElement {
  return (
    <div
      data-testid={`library-pulse-${label.toLowerCase()}`}
      style={{
        padding: '10px 12px 12px 16px',
        borderRight: lastInRow ? undefined : '1px solid var(--rule-soft)',
        minWidth: 0,
      }}
    >
      <div
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </div>
      <div
        className="u-serif"
        style={{
          fontSize: 'var(--step-2)',
          marginTop: 3,
          letterSpacing: '-0.015em',
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function summaryLine(total: number, domains: number, loading: boolean): string {
  if (loading) return '…';
  return `${total} highlights · ${domains} domains`;
}

export function LibraryPulse({
  totalHighlights,
  thisWeekCount,
  todayCount,
  totalDomains,
  withNotesCount,
  withTagsCount,
  loading = false,
  expanded,
  onToggle,
}: LibraryPulseProps): React.ReactElement {
  const v = (n: number): string => (loading ? '—' : String(n));
  const summary = summaryLine(totalHighlights, totalDomains, loading);

  return (
    <div data-testid="library-pulse" data-expanded={expanded ? 'true' : 'false'}>
      <button
        type="button"
        className="settings-disclose"
        data-testid="library-stats-toggle"
        aria-expanded={expanded}
        aria-controls="library-stats-panel"
        id="library-stats-toggle"
        onClick={onToggle}
      >
        <div style={{ minWidth: 0, textAlign: 'left' }}>
          <div className="settings-disclose-title">Library stats</div>
          <div className="settings-disclose-sub u-mono">{summary}</div>
        </div>
        <span className="settings-disclose-trail" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        <div
          id="library-stats-panel"
          role="region"
          aria-labelledby="library-stats-toggle"
          className="library-pulse-panel"
          data-testid="library-stats-panel"
        >
          <div className="library-pulse-row">
            <PulseCell label="Total" value={v(totalHighlights)} />
            <PulseCell label="Week" value={v(thisWeekCount)} />
            <PulseCell label="Today" value={v(todayCount)} lastInRow />
          </div>
          <div className="library-pulse-row">
            <PulseCell label="Domains" value={v(totalDomains)} />
            <PulseCell label="Notes" value={v(withNotesCount)} />
            <PulseCell label="Tags" value={v(withTagsCount)} lastInRow />
          </div>
        </div>
      ) : null}
    </div>
  );
}
