// System specimens — tokens, chrome rules, type, controls.
// Diff vs v2: what we keep, what we replace.

const { PopupShell, Seg, Switch, Btn, MODES } = window.V3;

function TokenSwatches() {
  const colors = [
    ["paper", "var(--paper)"],
    ["paper-2", "var(--paper-2)"],
    ["ink", "var(--ink)"],
    ["ink-3", "var(--ink-3)"],
    ["rule", "var(--rule)"],
    ["rule-soft", "var(--rule-soft)"],
    ["accent", "var(--accent)"],
    ["synced", "var(--synced)"],
  ];
  return (
    <div className="ue" style={{ width: 400, padding: 20, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
        Tokens
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {colors.map(([name, val]) => (
          <div key={name} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: val,
                border: "1px solid var(--rule-soft)",
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
            <div>
              <div className="u-mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
                {name}
              </div>
              <div className="u-sans" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {val.replace("var(", "").replace(")", "")}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, borderTop: "1px solid var(--rule-soft)", paddingTop: 14 }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Type roles</div>
        <div className="u-mono" style={{ fontSize: "var(--type-label)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 8, color: "var(--ink-3)" }}>
          label · 10px mono caps
        </div>
        <div className="u-mono" style={{ fontSize: "var(--type-meta)", marginTop: 4, color: "var(--ink-3)" }}>
          meta · 11px secondary
        </div>
        <div className="u-sans" style={{ fontSize: "var(--type-sub)", marginTop: 4, color: "var(--ink-2)" }}>
          sub · 12px paths / list subtitles
        </div>
        <div className="u-sans" style={{ fontSize: "var(--type-body)", marginTop: 4 }}>
          body · 13px UI copy
        </div>
        <div className="u-sans" style={{ fontSize: "var(--type-title-row)", fontWeight: 500, marginTop: 4 }}>
          title-row · 14px list titles
        </div>
        <div className="u-serif" style={{ fontSize: "var(--step-2)", marginTop: 8, letterSpacing: "-0.02em" }}>
          display · serif voice
        </div>
      </div>
    </div>
  );
}

function ChromeRules() {
  return (
    <div className="ue" style={{ width: 440, padding: 20, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
        Title strip
      </div>
      <div
        className="popup-chrome"
        style={{ marginTop: 14, border: "1px solid var(--rule)", position: "relative" }}
      >
        <div className="chrome-side chrome-place">
          <span className="chrome-place-label">Library</span>
        </div>
        <div className="chrome-brand">
          <span className="chrome-brand-label">_underscore</span>
        </div>
        <div className="chrome-side chrome-account">
          <button type="button" className="mode-pill">
            <span className="mode-dot" />
            <span>Pro</span>
          </button>
        </div>
      </div>
      <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr className="u-mono" style={{ textAlign: "left", color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <th style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>Slot</th>
            <th style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>Job</th>
            <th style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>Example</th>
          </tr>
        </thead>
        <tbody className="u-sans" style={{ color: "var(--ink-2)" }}>
          <tr>
            <td style={{ padding: "10px 8px 10px 0", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Left
            </td>
            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Current activity / page
            </td>
            <td style={{ padding: "10px 0", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Home · Library · Settings · Sign in
            </td>
          </tr>
          <tr>
            <td style={{ padding: "10px 8px 10px 0", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Center
            </td>
            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Brand name (always)
            </td>
            <td style={{ padding: "10px 0", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              _underscore
            </td>
          </tr>
          <tr>
            <td style={{ padding: "10px 8px 10px 0", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Right
            </td>
            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Account status pill
            </td>
            <td style={{ padding: "10px 0", borderBottom: "1px solid var(--rule-soft)", verticalAlign: "top" }}>
              Guest · Starter · Pro
            </td>
          </tr>
          <tr>
            <td style={{ padding: "10px 8px 10px 0", verticalAlign: "top" }}>
              Sub-header
            </td>
            <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
              Back only when stack depth &gt; 0
            </td>
            <td style={{ padding: "10px 0", verticalAlign: "top" }}>
              ← Library
            </td>
          </tr>
        </tbody>
      </table>
      <p className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12, lineHeight: 1.4 }}>
        Brand stays centered. Account pill opens Settings. Auth hides the pill.
      </p>
    </div>
  );
}

function ReplaceMap() {
  const rows = [
    ["Modes", "Ephemeral / Local / Cloud / AI", "Guest / Starter / Pro"],
    ["Tabs", "Home · Library · Settings", "Home · Library · Ask · Settings"],
    ["Home", "Stats + hero stack", "Anchor (Current page) + Recent stream"],
    ["Chrome", "Brand left · mode right", "Place left · brand center · account right"],
    ["Mode select", "Full-page variants", "Segmented control in Settings"],
    ["AI", "MCP-only exploration", "Ask tab + Connect hub + Models"],
    ["Type", "Step scale only", "Semantic roles + control geometry"],
    ["Accent", "Single terracotta", "Single terracotta (kept)"],
    ["Paper/ink", "Editorial paper", "Editorial paper (kept)"],
  ];
  return (
    <div className="ue" style={{ width: 520, padding: 20, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
        Replace map
      </div>
      <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr className="u-mono" style={{ textAlign: "left", color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <th style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>Area</th>
            <th style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>v2 / today</th>
            <th style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>v3 adopt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([area, from, to]) => (
            <tr key={area}>
              <td className="u-sans" style={{ padding: "8px 8px 8px 0", borderBottom: "1px solid var(--rule-soft)", fontWeight: 500 }}>
                {area}
              </td>
              <td className="u-sans" style={{ padding: "8px 8px", borderBottom: "1px solid var(--rule-soft)", color: "var(--ink-3)" }}>
                {from}
              </td>
              <td className="u-sans" style={{ padding: "8px 0", borderBottom: "1px solid var(--rule-soft)", color: "var(--ink)" }}>
                {to}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ControlsSpecimen() {
  return (
    <div className="ue" style={{ width: 400, padding: 20, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>Buttons</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <Btn variant="primary" size="sm">
          Primary
        </Btn>
        <Btn variant="accent" size="sm">
          Accent
        </Btn>
        <Btn variant="ghost" size="sm">
          Ghost
        </Btn>
        <Btn variant="ghost" size="sm" className="danger">
          Danger
        </Btn>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 6, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Segmented
        </div>
        <Seg options={["light", "dark", "system"]} value="dark" />
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Switch
        </div>
        <Switch on={false} />
        <Switch on />
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 6, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Field
        </div>
        <input className="field" defaultValue="Search highlights…" readOnly style={{ width: "100%" }} />
      </div>
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["css", "cascade", "product"].map((t) => (
          <span key={t} className="tag-pill">
            {t}
          </span>
        ))}
        <span className="chip active">Text</span>
        <span className="chip">Notes</span>
      </div>
    </div>
  );
}

function ModePillsSpecimen() {
  const rows = [
    { place: "Home", mode: "Guest" },
    { place: "Library", mode: "Starter" },
    { place: "Ask", mode: "Pro" },
    { place: "Settings", mode: "Pro" },
    { place: "Sign in", mode: null },
  ];
  return (
    <div className="ue" style={{ width: 400, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      {rows.map((r) => (
        <div
          key={r.place + (r.mode || "auth")}
          className="popup-chrome"
          style={{ borderBottom: "1px solid var(--rule-soft)", borderLeft: "none", borderRight: "none", borderTop: "none" }}
        >
          <div className="chrome-side chrome-place">
            <span className="chrome-place-label">{r.place}</span>
          </div>
          <div className="chrome-brand">
            <span className="chrome-brand-label">_underscore</span>
          </div>
          <div className="chrome-side chrome-account">
            {r.mode ? (
              <button type="button" className="mode-pill">
                <span className="mode-dot" />
                <span>{r.mode}</span>
              </button>
            ) : (
              <span className="chrome-place-spacer" aria-hidden="true" />
            )}
          </div>
        </div>
      ))}
      <div style={{ padding: 16 }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tabs</div>
        <nav className="tabbar" style={{ marginTop: 10, border: "1px solid var(--rule)" }} aria-label="Primary">
          {["Home", "Library", "Ask", "Settings"].map((t, i) => (
            <button key={t} type="button" className={i === 2 ? "active" : ""}>
              {t}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

window.V3System = {
  TokenSwatches,
  ChromeRules,
  ReplaceMap,
  ControlsSpecimen,
  ModePillsSpecimen,
};
