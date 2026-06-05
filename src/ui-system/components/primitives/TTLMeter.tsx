import React from 'react';

export interface TTLMeterProps {
  ms: number;
  total?: number;
}

export function TTLMeter({ ms, total = 24 * 3600 * 1000 }: TTLMeterProps): React.ReactElement {
  const pct = Math.max(0, Math.min(1, ms / total));
  const h = Math.floor(ms / 3600_000);
  const mn = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <div style={{ padding: "10px 16px", borderTop: "1px solid var(--rule-soft)", borderBottom: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span className="u-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Expires in
        </span>
        <span className="u-mono" style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
          {String(h).padStart(2, "0")}:{String(mn).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 2, height: 6 }}>
        {Array.from({ length: 24 }).map((_, i) => {
          const filled = i / 24 < pct;
          // eslint-disable-next-line no-restricted-syntax
          return <span key={i} style={{ background: filled ? "var(--accent)" : "var(--rule-soft)" }} />;
        })}
      </div>
    </div>
  );
}
