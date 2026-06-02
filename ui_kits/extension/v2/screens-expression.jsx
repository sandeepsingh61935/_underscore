// Variants for how the 4 modes are EXPRESSED visually —
// glyph, swatch, texture, typographic. Each shows all four modes.

function ExprVariant({ children, label }) {
  return <div style={{ display: "grid", gap: 10 }}>{children}</div>;
}

/* A — Glyph + color dot (current) */
function ExprGlyph() {
  return (
    <div className="ue" style={{ width: 340, background: "var(--paper)", border: "1px solid var(--rule)", padding: 18 }}>
      <div className="u-kicker" style={{ marginBottom: 10 }}>A · Glyph + dot</div>
      {MODES.map((m) => (
        <div key={m.id} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--rule-soft)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: m.accent, display: "inline-block" }} />
          <span style={{ width: 14, textAlign: "center", color: m.accent, fontSize: 14 }}>{m.motif}</span>
          <span className="u-serif" style={{ fontSize: 15 }}>{m.name}</span>
          <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.14em" }}>{m.tag}</span>
        </div>
      ))}
    </div>
  );
}

/* B — Swatch blocks, color-led */
function ExprSwatch() {
  return (
    <div className="ue" style={{ width: 340, background: "var(--paper)", border: "1px solid var(--rule)", padding: 14 }}>
      <div className="u-kicker" style={{ marginBottom: 10, paddingLeft: 4 }}>B · Color blocks</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {MODES.map((m) => (
          <div key={m.id} style={{ background: m.accent, color: "var(--utility-surface-elevated)", padding: 12, minHeight: 90, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span className="u-mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85 }}>{m.family}</span>
            <div>
              <div className="u-serif" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>{m.name}</div>
              <div className="u-mono" style={{ fontSize: 9, opacity: 0.85, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* C — Typographic only (no color), uniform treatment per Sandy */
function ExprType() {
  return (
    <div className="ue" style={{ width: 340, background: "var(--paper)", border: "1px solid var(--rule)", padding: 18 }}>
      <div className="u-kicker" style={{ marginBottom: 10 }}>C · Typographic</div>
      {MODES.map((m, i) => (
        <div key={m.id} style={{ padding: "10px 0", borderTop: i === 0 ? "1px solid var(--rule)" : "1px solid var(--rule-soft)", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
              {m.family === "local" ? "Device" : "Cloud"}
            </div>
            <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em", marginTop: 2 }}>
              {m.name}
              {m.id === "ai" && <sup className="u-mono" style={{ fontSize: 9, marginLeft: 4, color: "var(--ink-3)" }}>†</sup>}
            </div>
          </div>
          <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
            {m.ttl ? "24h" : "∞"}
          </div>
        </div>
      ))}
      <div className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 8 }}>
        † readable by AI &nbsp;·&nbsp; <span style={{ color: "var(--accent)" }}>uniform type across modes</span>
      </div>
    </div>
  );
}

/* D — Texture / rule patterns (accessibility-first) */
function ExprTexture() {
  const patterns = {
    ephemeral: "repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 5px)",
    local:     "var(--ink)",
    cloud:     "repeating-linear-gradient(0deg, var(--ink) 0 1px, transparent 1px 3px)",
    ai:        "repeating-linear-gradient(45deg, var(--ink) 0 1px, transparent 1px 4px)",
  };
  return (
    <div className="ue" style={{ width: 340, background: "var(--paper)", border: "1px solid var(--rule)", padding: 14 }}>
      <div className="u-kicker" style={{ marginBottom: 10, paddingLeft: 4 }}>D · Texture (no color)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {MODES.map((m) => (
          <div key={m.id} style={{ border: "1px solid var(--rule)", padding: 10 }}>
            <div style={{ height: 36, background: patterns[m.id], marginBottom: 8 }} />
            <div className="u-serif" style={{ fontSize: 14 }}>{m.name}</div>
            <div className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ExprGlyph, ExprSwatch, ExprType, ExprTexture });
