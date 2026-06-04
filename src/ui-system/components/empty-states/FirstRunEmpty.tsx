import React from 'react';

export function FirstRunEmpty(): React.ReactElement {
  return (
    <div style={{ flex: 1, padding: "28px 22px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
      <div className="u-kicker">Nothing captured yet</div>
      <div className="u-serif" style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Highlight anything on any page.
      </div>
      <div className="u-serif" style={{ fontSize: 14, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.5 }}>
        Select text, press <span className="u-mono" style={{ fontStyle: "normal", background: "var(--paper-2)", padding: "1px 6px" }}>⌘↩</span>, and it lands here — organized by where you found it.
      </div>
      <div style={{ marginTop: 10, height: 80, background: "var(--paper-2)", border: "1px dashed var(--rule-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>animated demo</span>
      </div>
    </div>
  );
}
