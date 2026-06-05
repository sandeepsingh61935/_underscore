import React from 'react';

export interface TTLBadgeProps {
  ms: number;
  total?: number;
}

export function TTLBadge({ ms, total = 24 * 3600 * 1000 }: TTLBadgeProps): React.ReactElement {
  const pct = Math.max(0, Math.min(1, ms / total));
  const h = Math.floor(ms / 3600_000);
  const mn = Math.floor((ms % 3600_000) / 60_000);
  const label = h >= 1 ? `${h}h ${mn}m` : `${mn}m`;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={`${label} remaining`}>
      <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>{label}</span>
      { }
      <span style={{ position: "relative", width: 40, height: 4, background: "var(--rule-soft)", display: 'inline-block' }}>
        {/* eslint-disable-next-line no-restricted-syntax */}
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, background: "var(--accent)" }} />
      </span>
    </span>
  );
}
