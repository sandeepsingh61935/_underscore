/**
 * Library pulse — compact practice stats for Settings (not Home).
 * Home stays anchor + stream; this is opt-in library health.
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
        padding: '10px 12px 11px 16px',
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
          marginTop: 2,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function LibraryPulse({
  totalHighlights,
  thisWeekCount,
  todayCount,
  totalDomains,
  withNotesCount,
  withTagsCount,
  loading = false,
}: LibraryPulseProps): React.ReactElement {
  const v = (n: number): string => (loading ? '—' : String(n));

  return (
    <div
      data-testid="library-pulse"
      role="region"
      aria-label="Library stats"
      style={{
        borderTop: '1px solid var(--rule-soft)',
        borderBottom: '1px solid var(--rule-soft)',
        background: 'var(--paper)',
        marginBottom: 4,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          borderBottom: '1px solid var(--rule-soft)',
        }}
      >
        <PulseCell label="Total" value={v(totalHighlights)} />
        <PulseCell label="Week" value={v(thisWeekCount)} />
        <PulseCell label="Today" value={v(todayCount)} lastInRow />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <PulseCell label="Domains" value={v(totalDomains)} />
        <PulseCell label="Notes" value={v(withNotesCount)} />
        <PulseCell label="Tags" value={v(withTagsCount)} lastInRow />
      </div>
    </div>
  );
}
