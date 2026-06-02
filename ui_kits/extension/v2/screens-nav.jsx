// Nav + dashboard + capture overlay + empty-state variants for _underscore v2.
const { useState: useStateNav } = React;

/* ─────────────────────────────────────────────────────────────
   Collections → Domain → Sub-domain navigation — 4 approaches
   ───────────────────────────────────────────────────────────── */

/* A — Drill-down (classic) */
function Nav_A({ dark }) {
  const [stack, setStack] = useStateNav([{ level: "collections" }]);
  const top = stack[stack.length - 1];
  return (
    <PopupFrame dark={dark} title="_underscore · library" mode="local">
      <ModeHeader modeId="local" onBack={stack.length > 1 ? () => setStack(stack.slice(0, -1)) : null}
        backLabel={stack.length === 2 ? "Library" : stack.length === 3 ? top.domain : "Back"} />
      <div style={{ padding: "10px 16px 0" }}>
        <div className="u-serif" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {top.level === "collections" && "Library"}
          {top.level === "domain" && top.domain}
          {top.level === "section" && top.section}
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 4 }}>
          {top.level === "collections" && `${SAMPLE_DATA.length} domains · 51 highlights`}
          {top.level === "domain" && "Sections"}
          {top.level === "section" && "Highlights"}
        </div>
      </div>
      <div className="list-scroll" style={{ marginTop: 10, flex: 1 }}>
        {top.level === "collections" && SAMPLE_DATA.map((d) => (
          <Row key={d.domain} title={d.domain} sub={`${d.sections.length} sections`}
            right={<span className="u-serif" style={{ fontSize: 16, fontStyle: "italic", color: "var(--ink-3)" }}>{d.count}</span>}
            onClick={() => setStack([...stack, { level: "domain", domain: d.domain }])} />
        ))}
        {top.level === "domain" && SAMPLE_DATA.find((d) => d.domain === top.domain).sections.map((s) => (
          <Row key={s.name} title={s.name}
            right={<span className="u-serif" style={{ fontSize: 16, fontStyle: "italic", color: "var(--ink-3)" }}>{s.count}</span>}
            onClick={() => setStack([...stack, { level: "section", domain: top.domain, section: s.name }])} />
        ))}
        {top.level === "section" && (
          <>
            <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain={top.domain} section={top.section} />
            <HighlightCard quote="Evaluation is not a phase. It is the practice." domain={top.domain} section={top.section} />
            <HighlightCard quote="Constitutional methods aim for principles, not rules." domain={top.domain} section={top.section} />
          </>
        )}
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

/* B — Expand in place (accordion, all 3 levels visible) */
function Nav_B({ dark }) {
  const [open, setOpen] = useStateNav({ "anthropic.com": true, "anthropic.com/Academy": true });
  const toggle = (k) => setOpen({ ...open, [k]: !open[k] });
  return (
    <PopupFrame dark={dark} title="_underscore · library" mode="local">
      <ModeHeader modeId="local" />
      <div style={{ padding: "12px 16px 6px" }}>
        <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Library</div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 2 }}>Outline · 51 highlights</div>
      </div>
      <div className="list-scroll" style={{ flex: 1 }}>
        {SAMPLE_DATA.map((d) => {
          const o = open[d.domain];
          return (
            <div key={d.domain}>
              <button onClick={() => toggle(d.domain)} style={{
                all: "unset", cursor: "pointer", display: "flex", width: "100%",
                padding: "10px 16px", borderBottom: "1px solid var(--rule-soft)",
                justifyContent: "space-between", alignItems: "baseline",
              }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", width: 10 }}>{o ? "−" : "+"}</span>
                  <span className="u-serif" style={{ fontSize: 16 }}>{d.domain}</span>
                </span>
                <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{d.count}</span>
              </button>
              {o && d.sections.map((s) => {
                const sk = `${d.domain}/${s.name}`;
                const so = open[sk];
                return (
                  <div key={sk}>
                    <button onClick={() => toggle(sk)} style={{
                      all: "unset", cursor: "pointer", display: "flex", width: "100%",
                      padding: "8px 16px 8px 34px", borderBottom: "1px solid var(--rule-soft)",
                      justifyContent: "space-between", alignItems: "baseline", background: "var(--paper-2)",
                    }}>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", width: 10 }}>{so ? "−" : "+"}</span>
                        <span className="u-serif" style={{ fontSize: 14, fontStyle: "italic" }}>{s.name}</span>
                      </span>
                      <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{s.count}</span>
                    </button>
                    {so && s.items.length > 0 && s.items.map((it, i) => (
                      <div key={i} style={{ padding: "8px 16px 8px 52px", borderBottom: "1px solid var(--rule-soft)" }}>
                        <div className="u-serif" style={{ fontSize: 13, lineHeight: 1.4 }}>“{it.q}”</div>
                      </div>
                    ))}
                    {so && s.items.length === 0 && (
                      <div style={{ padding: "10px 16px 10px 52px", borderBottom: "1px solid var(--rule-soft)" }}>
                        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.14em" }}>empty</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

/* C — Miller columns (left rail + detail) */
function Nav_C({ dark }) {
  const [domain, setDomain] = useStateNav("anthropic.com");
  const [section, setSection] = useStateNav("Academy");
  const d = SAMPLE_DATA.find((x) => x.domain === domain);
  const s = d.sections.find((x) => x.name === section) || d.sections[0];
  return (
    <PopupFrame dark={dark} title="_underscore · library" mode="local">
      <ModeHeader modeId="local" />
      <div style={{ display: "grid", gridTemplateColumns: "45% 1fr", flex: 1, minHeight: 0, borderBottom: "1px solid var(--rule)" }}>
        {/* Left: domains */}
        <div style={{ borderRight: "1px solid var(--rule)", overflow: "auto" }}>
          <div className="u-caps" style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Domains</div>
          {SAMPLE_DATA.map((x) => {
            const active = domain === x.domain;
            return (
              <button key={x.domain} onClick={() => { setDomain(x.domain); setSection(null); }} style={{
                all: "unset", cursor: "pointer", display: "flex", width: "100%",
                padding: "9px 10px", borderBottom: "1px solid var(--rule-soft)",
                justifyContent: "space-between", alignItems: "baseline",
                background: active ? "var(--rule)" : "transparent",
                color: active ? "var(--paper)" : "var(--ink)",
              }}>
                <span className="u-serif" style={{ fontSize: 13 }}>{x.domain}</span>
                <span className="u-mono" style={{ fontSize: 10, opacity: 0.7 }}>{x.count}</span>
              </button>
            );
          })}
        </div>
        {/* Right: sections */}
        <div style={{ overflow: "auto" }}>
          <div className="u-caps" style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Sections</div>
          {d.sections.map((x) => {
            const active = section === x.name;
            return (
              <button key={x.name} onClick={() => setSection(x.name)} style={{
                all: "unset", cursor: "pointer", display: "flex", width: "100%",
                padding: "9px 10px", borderBottom: "1px solid var(--rule-soft)",
                justifyContent: "space-between", alignItems: "baseline",
                background: active ? "var(--paper-2)" : "transparent",
              }}>
                <span className="u-serif" style={{ fontSize: 13, fontStyle: "italic" }}>{x.name}</span>
                <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{x.count}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Bottom: preview */}
      <div style={{ padding: "10px 14px" }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
          {d.domain} · {s.name} · 6 highlights
        </div>
        <div className="u-serif" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 4 }}>
          “Evaluation is not a phase. It is the practice.” <span style={{ color: "var(--ink-3)" }}>+ 5 more</span>
        </div>
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

/* D — Breadcrumb + grouped list with peekable cards */
function Nav_D({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore · library" mode="local">
      <ModeHeader modeId="local" />
      <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>Library</span>
        <span style={{ color: "var(--ink-3)" }}>›</span>
        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>anthropic.com</span>
      </div>
      <div style={{ padding: "4px 16px 6px" }}>
        <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>anthropic.com</div>
      </div>

      <div className="list-scroll" style={{ flex: 1 }}>
        {SAMPLE_DATA[0].sections.map((s, idx) => (
          <div key={s.name} style={{ borderBottom: "1px solid var(--rule)" }}>
            <div style={{ padding: "10px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="u-serif" style={{ fontSize: 15, fontStyle: "italic" }}>{s.name}</span>
              <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{s.count} highlights</span>
            </div>
            {idx === 0 && (
              <>
                <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section={s.name} density="compact" />
                <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section={s.name} density="compact" />
              </>
            )}
            {idx > 0 && (
              <div style={{ padding: "6px 16px 12px" }}>
                <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                  Tap to expand ›
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

/* ─────────────────────────────────────────────────────────────
   Dashboard / Home — active mode + jump to current domain
   ───────────────────────────────────────────────────────────── */
function Home_Ephemeral({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore" mode="ephemeral">
      <ModeHeader modeId="ephemeral" onSwitch={() => {}} />
      <div style={{ padding: "14px 16px 6px" }}>
        <div className="u-kicker">Current page</div>
        <div className="u-serif" style={{ fontSize: 19, lineHeight: 1.15, letterSpacing: "-0.01em", marginTop: 4 }}>
          anthropic.com / Academy
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
          3 highlights on this page
        </div>
      </div>
      <TTLMeter ms={3.5 * 3600_000 + 22 * 60_000} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Recent</div>
      <div className="list-scroll" style={{ flex: 1 }}>
        <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section="Academy" ttlMs={18 * 3600_000} />
        <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section="Academy" ttlMs={9 * 3600_000} />
        <HighlightCard quote="Constitutional methods aim for principles, not rules." domain="anthropic.com" section="Academy" ttlMs={3.5 * 3600_000} />
      </div>
      <TabBar active="home" />
    </PopupFrame>
  );
}

function Home_Cloud({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore" mode="cloud">
      <ModeHeader modeId="cloud" onSwitch={() => {}} />
      <div style={{ padding: "14px 16px 8px" }}>
        <div className="u-kicker">Good morning, Alex</div>
        <div className="u-serif" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.02em", marginTop: 6 }}>
          51 highlights across 4 domains.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--rule)" }}>
        <Stat label="This week" value="12" />
        <Stat label="Synced" value="4 devices" mono />
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Jump to this page</div>
      <Row title="anthropic.com / Academy" sub="3 highlights on this page" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>→</span>} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Recent</div>
      <div className="list-scroll" style={{ flex: 1 }}>
        <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section="Academy" />
        <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section="Academy" />
      </div>
      <TabBar active="home" />
    </PopupFrame>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div style={{ padding: "12px 16px", borderRight: "1px solid var(--rule-soft)" }}>
      <div className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{label}</div>
      <div className={mono ? "u-mono" : "u-serif"} style={{ fontSize: mono ? 15 : 22, marginTop: 2, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-domain detail with TTL-bearing highlights (ephemeral mode)
   ───────────────────────────────────────────────────────────── */
function SubDomainView({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore · library" mode="ephemeral">
      <ModeHeader modeId="ephemeral" onBack={() => {}} backLabel="anthropic.com" />
      <div style={{ padding: "10px 16px 6px" }}>
        <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>Academy</div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.14em" }}>
          6 highlights · ephemeral
        </div>
      </div>
      <div className="list-scroll" style={{ flex: 1 }}>
        <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section="Academy" ttlMs={18 * 3600_000} />
        <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section="Academy" ttlMs={9 * 3600_000} />
        <HighlightCard quote="Constitutional methods aim for principles, not rules." domain="anthropic.com" section="Academy" ttlMs={3.5 * 3600_000} />
        <HighlightCard quote="The practice of evaluation is the practice of taste." domain="anthropic.com" section="Academy" ttlMs={1.2 * 3600_000} />
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

/* ─────────────────────────────────────────────────────────────
   Content-script capture overlays — 4 approaches, shown on a
   faux webpage background.
   ───────────────────────────────────────────────────────────── */
function FauxPage({ children, w = 520, h = 340 }) {
  return (
    <div style={{ width: w, height: h, background: "#fdfcf8", border: "1px solid var(--rule-soft)", position: "relative", overflow: "hidden", fontFamily: "var(--serif)" }}>
      {/* masthead */}
      <div style={{ padding: "10px 18px 8px", borderBottom: "1px solid var(--rule-soft)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="u-serif" style={{ fontSize: 18, fontStyle: "italic", letterSpacing: "-0.02em" }}>The Weekly</span>
        <span className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>Vol. 42 · Apr 24, 2026</span>
      </div>
      <div style={{ padding: "16px 24px", color: "#222" }}>
        <div className="u-serif" style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 500 }}>
          On the long arc of attention
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.14em" }}>
          Essay · 8 min read
        </div>
        <p className="u-serif" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 14, color: "#333" }}>
          The best prompts are small acts of care. <span style={{ background: "rgba(201,100,66,0.18)", borderBottom: "1.5px solid var(--accent)", padding: "0 2px" }}>A good prompt is one you could hand to a thoughtful colleague</span> — plain, specific, and honest about what it knows. The rest is editing.
        </p>
      </div>
      {children}
    </div>
  );
}

function Capture_Tooltip() {
  return (
    <FauxPage>
      <div style={{ position: "absolute", left: 180, top: 220, background: "var(--ink)", color: "var(--paper)", padding: "6px 8px", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--sans)", fontSize: 11 }}>
        <span className="u-mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>_</span>
        <span>Highlight</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span className="u-mono" style={{ fontSize: 10 }}>⌘↩</span>
        <span style={{ width: 1, height: 12, background: "var(--paper)", opacity: 0.25 }} />
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)" }} />
        <span className="u-mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>ephemeral</span>
        <span style={{ position: "absolute", left: 18, bottom: -6, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid var(--ink)" }} />
      </div>
    </FauxPage>
  );
}

function Capture_Toolbar() {
  return (
    <FauxPage>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderTop: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--mode-ephemeral)" }} />
          <span className="u-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>Ephemeral · 24h</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost sm">Dismiss</button>
          <button className="btn primary sm">Save highlight</button>
        </div>
      </div>
    </FauxPage>
  );
}

function Capture_Sidebar() {
  return (
    <FauxPage>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 180, background: "var(--paper)", borderLeft: "1px solid var(--rule)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="u-kicker">_underscore</div>
        <div className="u-serif" style={{ fontSize: 14, fontStyle: "italic", color: "var(--ink-2)" }}>On this page</div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>3 highlights</div>
        <div style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: 8 }}>
          <div className="u-serif" style={{ fontSize: 12, lineHeight: 1.35 }}>“A good prompt…”</div>
          <div className="u-serif" style={{ fontSize: 12, lineHeight: 1.35, color: "var(--ink-3)", marginTop: 6 }}>“Evaluation is…”</div>
        </div>
        <button className="btn accent sm" style={{ marginTop: "auto" }}>+ Capture</button>
      </div>
    </FauxPage>
  );
}

function Capture_Popover() {
  return (
    <FauxPage>
      <div style={{ position: "absolute", left: 160, top: 230, width: 240, background: "var(--paper)", border: "1px solid var(--rule)", padding: 12, fontFamily: "var(--sans)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="u-kicker">Save highlight</span>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--mode-ephemeral)" }} />
        </div>
        <div className="u-serif" style={{ fontSize: 12, lineHeight: 1.4, marginTop: 8, fontStyle: "italic", color: "var(--ink-2)" }}>
          “A good prompt is one you could hand to a thoughtful colleague.”
        </div>
        <div className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.14em" }}>
          Ephemeral · expires in 24h
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button className="btn ghost sm" style={{ flex: 1 }}>Cancel</button>
          <button className="btn primary sm" style={{ flex: 1 }}>Save</button>
        </div>
      </div>
    </FauxPage>
  );
}

/* ─────────────────────────────────────────────────────────────
   Empty states — 4 variants
   ───────────────────────────────────────────────────────────── */
function Empty_A({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore" mode="local">
      <ModeHeader modeId="local" />
      <div style={{ flex: 1, padding: "28px 22px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
        <div className="u-kicker">Nothing captured yet</div>
        <div className="u-serif" style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Highlight anything on any page.
        </div>
        <div className="u-serif" style={{ fontSize: 14, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.5 }}>
          Select text, press <span className="u-mono" style={{ fontStyle: "normal", background: "var(--paper-2)", padding: "1px 6px" }}>⌘↩</span>, and it lands here — organized by where you found it.
        </div>
        <Ph h={80} label="animated demo" style={{ marginTop: 10 }} />
      </div>
      <TabBar active="home" />
    </PopupFrame>
  );
}

function Empty_B({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore" mode="local">
      <ModeHeader modeId="local" onBack={() => {}} backLabel="anthropic.com" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 20, textAlign: "center" }}>
        <div style={{ width: 50, height: 50, border: "1px dashed var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <span className="u-serif" style={{ fontSize: 28, color: "var(--ink-3)", fontStyle: "italic" }}>“</span>
        </div>
        <div className="u-serif" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>No highlights in Guidelines</div>
        <div className="u-serif" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic", maxWidth: 260 }}>
          This section of anthropic.com is empty. Head back to explore others.
        </div>
        <button className="btn ghost sm" style={{ marginTop: 14 }}>← Back to anthropic.com</button>
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

function Empty_C({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore · library" mode="local">
      <ModeHeader modeId="local" />
      <div style={{ padding: "12px 16px 6px" }}>
        <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Library</div>
      </div>
      <div style={{ flex: 1, padding: "6px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ padding: 12, border: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
          <div className="u-kicker">Try a starter</div>
          <div className="u-serif" style={{ fontSize: 14, marginTop: 6 }}>Read anything lately? Highlight a phrase to begin.</div>
          <button className="btn sm" style={{ marginTop: 10 }}>Open a sample article</button>
        </div>
        <div style={{ padding: 12, border: "1px dashed var(--rule-soft)" }}>
          <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>Keyboard</div>
          <div className="u-serif" style={{ fontSize: 13, marginTop: 4 }}>Select text · press <span className="u-mono">⌘↩</span></div>
        </div>
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

function Empty_D({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore" mode="ephemeral">
      <ModeHeader modeId="ephemeral" />
      <div style={{ flex: 1, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
        <div className="u-serif" style={{ fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          A fresh 24&#8202;hours.
        </div>
        <div className="u-serif" style={{ fontSize: 14, color: "var(--ink-3)", fontStyle: "italic" }}>
          Ephemeral mode keeps today's captures for a day. Nothing yet — whatever you save now will expire by this time tomorrow.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn sm" style={{ flex: 1 }}>Switch mode</button>
          <button className="btn accent sm" style={{ flex: 1 }}>Start capturing</button>
        </div>
      </div>
      <TabBar active="home" />
    </PopupFrame>
  );
}

/* ─────────────────────────────────────────────────────────────
   Settings — full version with typography preset picker
   ───────────────────────────────────────────────────────────── */
function Settings({ dark, typeId = "editorial" }) {
  return (
    <PopupFrame dark={dark} title="_underscore · settings" mode="cloud">
      <ModeHeader modeId="cloud" />
      <div style={{ padding: "12px 16px 6px" }}>
        <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Settings</div>
      </div>
      <div className="list-scroll" style={{ flex: 1 }}>
        <div className="u-caps" style={{ padding: "12px 16px 4px", color: "var(--ink-3)" }}>Typography</div>
        {Object.entries(TYPE_PRESETS).map(([id, p]) => {
          const active = id === typeId;
          return (
            <button key={id} style={{
              all: "unset", cursor: "pointer", display: "block", width: "100%",
              padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)",
              background: active ? "var(--paper-2)" : "transparent",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontFamily: p.serif, fontSize: 16, letterSpacing: "-0.01em" }}>{p.name}</div>
                  <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3, letterSpacing: "0.04em" }}>{p.note}</div>
                </div>
                <span className="u-mono" style={{ fontSize: 10, color: active ? "var(--accent)" : "var(--ink-3)" }}>
                  {active ? "● selected" : "○"}
                </span>
              </div>
            </button>
          );
        })}
        <div className="u-mono" style={{ fontSize: 9, color: "var(--ink-4)", padding: "6px 16px 10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Applied uniformly across the app
        </div>

        <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>General</div>
        <Row title="Theme" sub="Match system" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Auto</span>} />
        <Row title="Mode" sub="Cloud · synced" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Change</span>} />
        <Row title="Density" sub="Comfortable" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Edit</span>} />

        <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Account</div>
        <Row title="alex@weekly.co" sub="Signed in" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Sign out</span>} />
        <Row title="Configure AI providers" sub="Opens web app" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>↗</span>} />
        <Row title="Export highlights" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>→</span>} />
      </div>
      <TabBar active="settings" />
    </PopupFrame>
  );
}

/* ─────────────────────────────────────────────────────────────
   Library hierarchy — distinct typography per level (Sandy's reply)
   Library (root)  → display serif, large
   Domain          → serif italic, medium
   Sub-domain      → sans semibold, all-caps tracked
   Highlight       → serif body, quote-styled
   ───────────────────────────────────────────────────────────── */
function LibraryHierarchy() {
  return (
    <div className="ue" style={{ width: 380, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      {/* L1 — Library */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--rule)" }}>
        <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>L1 · Root</div>
        <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-0.025em", marginTop: 4 }}>
          Library
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>
          serif · 32 / -0.025em · weight 500
        </div>
      </div>

      {/* L2 — Domain */}
      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--rule-soft)" }}>
        <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>L2 · Domain</div>
        <div className="u-serif" style={{ fontSize: 22, fontStyle: "italic", letterSpacing: "-0.015em", marginTop: 4 }}>
          anthropic.com
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>
          serif italic · 22 · weight 500
        </div>
      </div>

      {/* L3 — Sub-domain (section) */}
      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--rule-soft)" }}>
        <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>L3 · Sub-domain</div>
        <div className="u-sans" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 6 }}>
          Academy
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>
          sans 600 · 13 · tracked 0.16em uppercase
        </div>
      </div>

      {/* L4 — Highlight (leaf) */}
      <div style={{ padding: "14px 18px 16px" }}>
        <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>L4 · Highlight</div>
        <div className="u-serif" style={{ fontSize: 15, lineHeight: 1.45, marginTop: 6 }}>
          <span className="qmark" style={{ fontSize: 22, lineHeight: 0, marginRight: 3 }}>“</span>
          A good prompt is one you could hand to a thoughtful colleague.
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 8 }}>
          serif body · 15 / 1.45 · pull-quote treatment
        </div>
      </div>
    </div>
  );
}

/* In-context preview — how the levels read together in a real flow */
function LibraryHierarchyInContext() {
  return (
    <PopupFrame title="_underscore · library" mode="local">
      <ModeHeader modeId="local" onBack={() => {}} backLabel="Library" />
      <div style={{ padding: "10px 16px 4px" }}>
        <div className="u-serif" style={{ fontSize: 22, fontStyle: "italic", letterSpacing: "-0.015em" }}>
          anthropic.com
        </div>
      </div>
      <div className="list-scroll" style={{ flex: 1 }}>
        {[
          { sec: "Academy", items: [
            "A good prompt is one you could hand to a thoughtful colleague.",
            "Evaluation is not a phase. It is the practice.",
          ]},
          { sec: "Research Papers", items: [
            "Constitutional methods aim for principles, not rules.",
          ]},
          { sec: "Guidelines", items: [] },
        ].map((s) => (
          <div key={s.sec} style={{ borderBottom: "1px solid var(--rule)" }}>
            <div style={{ padding: "12px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="u-sans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                {s.sec}
              </span>
              <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{s.items.length}</span>
            </div>
            {s.items.length === 0 && (
              <div style={{ padding: "0 16px 12px" }}>
                <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.14em" }}>empty</span>
              </div>
            )}
            {s.items.map((q, i) => (
              <div key={i} style={{ padding: "0 16px 12px" }}>
                <div className="u-serif" style={{ fontSize: 14, lineHeight: 1.45 }}>
                  <span className="qmark" style={{ fontSize: 20, lineHeight: 0, marginRight: 2 }}>“</span>
                  {q}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <TabBar active="collections" />
    </PopupFrame>
  );
}

window.LibraryHierarchy = LibraryHierarchy;
window.LibraryHierarchyInContext = LibraryHierarchyInContext;

Object.assign(window, {
  Nav_A, Nav_B, Nav_C, Nav_D,
  Home_Ephemeral, Home_Cloud,
  SubDomainView,
  Capture_Tooltip, Capture_Toolbar, Capture_Sidebar, Capture_Popover,
  Empty_A, Empty_B, Empty_C, Empty_D,
  Settings,
});
