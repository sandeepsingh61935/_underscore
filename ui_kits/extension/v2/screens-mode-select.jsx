// Mode selection variants — the first-run + switchable screen.
// Four distinct approaches to presenting 4 modes in 2 families
// inside a 400×600 popup.

const { useState: useStateMS } = React;

/* ───── Variant A — Editorial stack (front-page style) ───── */
function ModeSelect_A({ dark }) {
  const [sel, setSel] = useStateMS("local");
  return (
    <PopupFrame dark={dark} title="_underscore · setup">
      <div style={{ padding: "20px 18px 8px" }}>
        <div className="u-kicker" style={{ marginBottom: 6 }}>Vol. 1 · Setup</div>
        <div className="u-serif" style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          Choose how <em>_underscore</em> remembers.
        </div>
        <div className="u-serif" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic" }}>
          Two families. Four modes. Switchable anytime.
        </div>
      </div>
      <div className="u-rule" style={{ margin: "12px 18px 0" }} />

      <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>On this device</div>
      {[MODES[0], MODES[1]].map((m) => (
        <ModeRow_A key={m.id} m={m} active={sel === m.id} onClick={() => setSel(m.id)} />
      ))}
      <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>In the cloud</div>
      {[MODES[2], MODES[3]].map((m) => (
        <ModeRow_A key={m.id} m={m} active={sel === m.id} onClick={() => setSel(m.id)} />
      ))}

      <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--rule)", display: "flex", gap: 8 }}>
        <button className="btn ghost sm" style={{ flex: 1 }}>Later</button>
        <button className="btn accent sm" style={{ flex: 2 }}>Continue as {modeById(sel).name} →</button>
      </div>
    </PopupFrame>
  );
}
function ModeRow_A({ m, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "block", width: "100%",
      padding: "12px 18px",
      borderBottom: "1px solid var(--rule-soft)",
      background: active ? "var(--paper-2)" : "transparent",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
          <span style={{ color: m.accent, fontSize: 14, lineHeight: 1 }}>{m.motif}</span>
          <div className="u-serif" style={{ fontSize: 17 }}>{m.name}</div>
          {m.signin && <span className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>sign-in</span>}
          {m.ttl && <span className="u-mono" style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.14em", textTransform: "uppercase" }}>24h ttl</span>}
        </div>
        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
          {active ? "●" : "○"}
        </span>
      </div>
      <div className="u-serif" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, fontStyle: "italic" }}>
        {m.blurb}
      </div>
    </button>
  );
}

/* ───── Variant B — Two-column families (cards) ───── */
function ModeSelect_B({ dark }) {
  const [sel, setSel] = useStateMS("cloud");
  return (
    <PopupFrame dark={dark} title="_underscore · setup">
      <div style={{ padding: "18px 16px 10px" }}>
        <div className="u-kicker">Memory model</div>
        <div className="u-serif" style={{ fontSize: 22, lineHeight: 1.15, marginTop: 4 }}>
          Where should highlights live?
        </div>
      </div>
      <div style={{ padding: "0 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FamilyCol title="Device" note="No account" modes={[MODES[0], MODES[1]]} sel={sel} setSel={setSel} />
        <FamilyCol title="Cloud" note="Sign-in" modes={[MODES[2], MODES[3]]} sel={sel} setSel={setSel} />
      </div>
      <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--rule)" }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 8, letterSpacing: "0.08em" }}>
          {modeById(sel).persistence.toUpperCase()}
        </div>
        <button className="btn accent" style={{ width: "100%" }}>
          Use {modeById(sel).name} mode
        </button>
      </div>
    </PopupFrame>
  );
}
function FamilyCol({ title, note, modes, sel, setSel }) {
  return (
    <div style={{ border: "1px solid var(--rule)", background: "var(--paper)" }}>
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="u-serif" style={{ fontSize: 14, fontStyle: "italic" }}>{title}</span>
        <span className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{note}</span>
      </div>
      {modes.map((m) => {
        const active = sel === m.id;
        return (
          <button key={m.id} onClick={() => setSel(m.id)} style={{
            all: "unset", cursor: "pointer", display: "block", width: "100%",
            padding: "12px 10px",
            borderBottom: "1px solid var(--rule-soft)",
            background: active ? "var(--rule)" : "transparent",
            color: active ? "var(--paper)" : "var(--ink)",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ color: active ? "var(--paper)" : m.accent, fontSize: 13 }}>{m.motif}</span>
              <span className="u-serif" style={{ fontSize: 15 }}>{m.name}</span>
            </div>
            <div className="u-mono" style={{ fontSize: 9, marginTop: 4, opacity: 0.7, letterSpacing: "0.05em" }}>
              {m.tag}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ───── Variant C — Horizontal swatch strip + detail ───── */
function ModeSelect_C({ dark }) {
  const [sel, setSel] = useStateMS("ai");
  const m = modeById(sel);
  return (
    <PopupFrame dark={dark} title="_underscore · setup">
      <div style={{ padding: "18px 16px 8px" }}>
        <div className="u-kicker">Choose a mode</div>
      </div>
      {/* swatch strip */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {MODES.map((mm) => {
          const active = sel === mm.id;
          return (
            <button key={mm.id} onClick={() => setSel(mm.id)} style={{
              all: "unset", cursor: "pointer",
              height: 60,
              background: active ? mm.accent : "var(--paper-2)",
              border: "1px solid",
              borderColor: active ? mm.accent : "var(--rule-soft)",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: 8,
              color: active ? "var(--utility-surface-elevated)" : "var(--ink-2)",
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{mm.motif}</span>
              <span className="u-mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>{mm.name}</span>
            </button>
          );
        })}
      </div>
      {/* family dots */}
      <div style={{ padding: "8px 16px 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {MODES.map((mm) => (
          <div key={mm.id} className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {mm.family}
          </div>
        ))}
      </div>

      <div style={{ padding: "18px 16px 0", flex: 1 }}>
        <div className="u-serif" style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
          {m.name} <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>— {m.tag}</span>
        </div>
        <p className="u-serif" style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.5 }}>
          {m.blurb}
        </p>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          <Fact label="Storage" value={m.family === "local" ? "This device only" : "Cloud · synced"} />
          <Fact label="Account" value={m.signin ? "Required" : "None"} />
          <Fact label="Lifetime" value={m.ttl ? "24 hours" : "Until deleted"} />
          {m.id === "ai" && <Fact label="Exposed to" value="LLM providers via MCP" warn />}
        </div>
      </div>

      <div style={{ padding: 14, borderTop: "1px solid var(--rule)" }}>
        <button className="btn primary" style={{ width: "100%" }}>
          {m.signin ? `Sign in & use ${m.name}` : `Use ${m.name}`}
        </button>
      </div>
    </PopupFrame>
  );
}
function Fact({ label, value, warn }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dotted var(--rule-soft)", paddingBottom: 4 }}>
      <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      <span className="u-serif" style={{ fontSize: 13, color: warn ? "var(--accent)" : "var(--ink)" }}>{value}</span>
    </div>
  );
}

/* ───── Variant D — Slider along a privacy axis ───── */
function ModeSelect_D({ dark }) {
  const [idx, setIdx] = useStateMS(1);
  const m = MODES[idx];
  return (
    <PopupFrame dark={dark} title="_underscore · setup">
      <div style={{ padding: "18px 16px 8px" }}>
        <div className="u-kicker">On a scale of private → useful</div>
        <div className="u-serif" style={{ fontSize: 22, lineHeight: 1.15, marginTop: 4, letterSpacing: "-0.02em" }}>
          Pick a balance.
        </div>
      </div>

      {/* Axis */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ position: "relative", height: 36 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 17, height: 2, background: "var(--rule)" }} />
          {MODES.map((mm, i) => {
            const pct = (i / (MODES.length - 1)) * 100;
            const active = i === idx;
            return (
              <button key={mm.id} onClick={() => setIdx(i)} style={{
                all: "unset", cursor: "pointer",
                position: "absolute", left: `${pct}%`, transform: "translate(-50%, 0)", top: 6,
                width: 24, height: 24, borderRadius: 99,
                background: active ? mm.accent : "var(--paper)",
                border: `2px solid ${active ? mm.accent : "var(--rule)"}`,
                color: active ? "var(--utility-surface-elevated)" : "var(--ink-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11,
              }}>{mm.motif}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.12em" }}>ephemeral</span>
          <span className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.12em" }}>AI-enabled</span>
        </div>
      </div>

      <div style={{ padding: "22px 20px 0", flex: 1 }}>
        <div className="u-serif" style={{ fontSize: 24, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {m.name}.
        </div>
        <div className="u-serif" style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 10, fontStyle: "italic" }}>
          {m.blurb}
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 6 }}>
          <Pill label={m.family === "local" ? "Device" : "Cloud"} />
          <Pill label={m.signin ? "Sign-in" : "No account"} />
          <Pill label={m.ttl ? "24h TTL" : "Kept"} accent={m.ttl} />
        </div>
      </div>

      <div style={{ padding: 14, borderTop: "1px solid var(--rule)" }}>
        <button className="btn accent" style={{ width: "100%" }}>Use {m.name} →</button>
      </div>
    </PopupFrame>
  );
}
function Pill({ label, accent }) {
  return (
    <span className="u-mono" style={{
      fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
      padding: "4px 8px",
      border: `1px solid ${accent ? "var(--accent)" : "var(--rule)"}`,
      color: accent ? "var(--accent)" : "var(--ink-2)",
    }}>{label}</span>
  );
}

Object.assign(window, { ModeSelect_A, ModeSelect_B, ModeSelect_C, ModeSelect_D });
