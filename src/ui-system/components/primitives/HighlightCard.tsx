/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L767-795 (V2_HighlightCard)
 * V2 contract:
 *   - Background var(--paper), border-bottom 1px var(--rule-soft).
 *   - Two densities: compact 10px / comfortable 14px vertical padding.
 *   - Quote: u-serif, 14px, --ink. qmark glyph 28px.
 *   - Meta: u-mono, 10px, --ink-3, "domain" or "domain / section".
 *   - Optional inline TTLBadge when ttlMs set.
 */
import React from 'react';

import { TTLBadge } from './TTLBadge';

export interface HighlightCardProps {
  quote: string;
  domain: string;
  section?: string;
  url?: string;
  ttlMs?: number;
  density?: "compact" | "comfortable";
}

export function HighlightCard({ quote, domain, section, ttlMs, density = "comfortable" }: HighlightCardProps): React.ReactElement {
  const padY = density === "compact" ? 10 : 14;
  return (
    <div style={{ padding: `${padY}px 16px`, borderBottom: "1px solid var(--rule-soft)", width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="qmark" style={{ fontSize: 28, lineHeight: 0.8, marginTop: 4 }}>“</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="u-serif" style={{ fontSize: 14, lineHeight: 1.4, color: "var(--ink)" }}>
            {quote}
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
              {domain}{section ? ` / ${section}` : ""}
            </div>
            {ttlMs !== undefined && ttlMs !== null && <TTLBadge ms={ttlMs} />}
          </div>
        </div>
      </div>
    </div>
  );
}
