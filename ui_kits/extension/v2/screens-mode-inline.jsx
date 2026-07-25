// Mode-in-Settings — designed from LIVE production code, not archived wireframes.
//
// Source of truth (codebase):
//   SettingsPage.tsx          — Mode Row: clickable only when authenticated
//   usePersistedMode.ts       — authed cannot set basic; guest cannot set pro*
//   ModeSelectionView.tsx     — full-page picker + Continue (to retire)
//   ModeHeader.tsx            — "Switch ›" → MODE_SELECTION (to remove)
//   resolve-popup-initial-route.ts — !hasSeenModeSelection → MODE_SELECTION
//   mode-transition-rules.ts  — pro ↔ pro_xai free; basic gated by auth
//   MODE_BRANDING             — Guest / Account (Free) / Account (Paid)
//   TypographySettings.tsx    — expand-in-place pattern to mirror
//   LibraryEmptyGuest.tsx     — empty-state education pattern
//   SettingsStatusGlyph.tsx   — lock / chevron trailing
//
// Real choice space:
//   Guest session  → mode is fixed (basic). "Upgrade" = Sign in (Account row).
//   Authed session → only Free ↔ Paid. That is the entire mode picker.

const { useState: useStateMI } = React;

/* ── Production branding (mirrors mode-branding.ts) ── */
const BRAND = {
  basic: {
    id: "basic",
    name: "Guest",
    tagline: "Local only",
    description: "Highlights live permanently on this device. Sign in to sync across devices.",
    familyLabel: "on this device",
  },
  pro: {
    id: "pro",
    name: "Account (Free)",
    tagline: "Synced",
    description: "Signed in. Synced across every device you use.",
    familyLabel: "cloud",
    planPill: "Free",
  },
  pro_xai: {
    id: "pro_xai",
    name: "Account (Paid)",
    tagline: "Synced + AI",
    description: "Cloud sync plus Connect to AI and in-app chat. Bring your own model.",
    familyLabel: "cloud",
    planPill: "Paid",
  },
};

/* ── Chrome atoms matching PopupShell + ModeHeader + TabBar ── */

function ProdTitleStrip({ title, modeId }) {
  const m = BRAND[modeId] || BRAND.basic;
  return (
    <div style={{
      background: "var(--paper-2)",
      borderLeft: "1px solid var(--rule)",
      borderRight: "1px solid var(--rule)",
      borderTop: "1px solid var(--rule)",
      padding: "8px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
      textTransform: "uppercase", color: "var(--ink-3)",
    }}>
      <span>{title}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", display: "inline-block" }} />
        {m.name}
      </span>
    </div>
  );
}

function ProdModeHeader({ modeId, showSwitch, onBack, backLabel }) {
  const m = BRAND[modeId] || BRAND.basic;
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: "1px solid var(--rule)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--paper)", minHeight: 44,
    }}>
      {onBack ? (
        <button className="u-mono" style={{
          all: "unset", cursor: "pointer",
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)",
        }}>← {backLabel || "Back"}</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent)" }} />
          <span className="u-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-2)" }}>
            {m.name} · {m.familyLabel}
          </span>
        </div>
      )}
      {showSwitch && (
        <span className="u-mono" style={{
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)",
        }}>Switch ›</span>
      )}
    </div>
  );
}

function ProdTabBar({ active = "settings" }) {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "collections", label: "Library" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={active === t.id ? "active" : ""}>{t.label}</button>
      ))}
    </div>
  );
}

function ProdShell({ title, modeId, showSwitch, children, activeTab = "settings", onBack, backLabel }) {
  return (
    <div className="ue" style={{ width: 400 }}>
      <ProdTitleStrip title={title} modeId={modeId} />
      <div className="popup" style={{ borderTop: "none", display: "flex", flexDirection: "column", height: 560 }}>
        <ProdModeHeader modeId={modeId} showSwitch={showSwitch} onBack={onBack} backLabel={backLabel} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children}
        </div>
        <ProdTabBar active={activeTab} />
      </div>
    </div>
  );
}

function MonoTrail({ children, accent }) {
  return (
    <span className="u-mono" style={{
      fontSize: 10, color: accent ? "var(--accent)" : "var(--ink-3)",
    }}>{children}</span>
  );
}

function PlanPill({ modeId }) {
  if (modeId !== "pro" && modeId !== "pro_xai") return null;
  const paid = modeId === "pro_xai";
  return (
    <span className="u-mono" data-testid="account-plan-pill" style={{
      fontSize: 10, padding: "2px 8px",
      border: "1px solid var(--rule-soft)",
      color: paid ? "var(--accent)" : "var(--ink-3)",
    }}>{paid ? "Paid" : "Free"}</span>
  );
}

/* ═══════════════════════════════════════════════════════════
   TODAY — production Settings (authenticated): Mode → Change → page
   ═══════════════════════════════════════════════════════════ */

function Settings_Today_Authed() {
  return (
    <ProdShell title="_underscore · settings" modeId="pro" showSwitch>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "12px 16px 6px" }}>
          <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Settings</div>
        </div>
        <div className="list-scroll" style={{ flex: 1, minHeight: 0 }}>
          {/* Typography collapsed — production default */}
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)",
            display: "grid", gridTemplateColumns: "1fr auto", gap: 10, minHeight: 44,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Typography</div>
              <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>Editorial</div>
            </div>
            <MonoTrail>▸</MonoTrail>
          </div>

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>General</div>
          <Row title="Theme" sub="Match system" right={<MonoTrail>system</MonoTrail>} />
          <Row
            title="Mode"
            sub="Account (Free) · synced"
            right={<MonoTrail accent>Change</MonoTrail>}
          />
          <Row title="Density" sub="Comfortable" right={<MonoTrail>Edit</MonoTrail>} />

          <div style={{
            margin: "12px 16px", padding: "12px 14px",
            border: "1px dashed var(--rule-soft)", background: "var(--paper-2)",
          }}>
            <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)" }}>
              Code path today
            </div>
            <div className="u-serif" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.45, fontStyle: "italic" }}>
              onChangeMode → View.MODE_SELECTION → pick → Continue → COLLECTIONS.
              Header Switch › is the same handler. Guest Mode row is not clickable.
            </div>
          </div>

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Account</div>
          <Row
            title="alex@weekly.co"
            sub="Account (Free) · synced"
            right={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <PlanPill modeId="pro" />
                <MonoTrail>Sign out</MonoTrail>
              </span>
            }
          />
        </div>
      </div>
    </ProdShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   TODAY — production ModeSelectionView (authed sees cloud only)
   ═══════════════════════════════════════════════════════════ */

function ModePage_Today_Authed() {
  const [sel, setSel] = useStateMI("pro");
  const cloud = [BRAND.pro, BRAND.pro_xai];
  const active = BRAND[sel];
  return (
    <div className="ue" style={{ width: 400 }}>
      <ProdTitleStrip title="_underscore" modeId={sel} />
      <div className="popup" style={{ borderTop: "none", height: 560, display: "flex", flexDirection: "column" }}>
        {/* MODE_SELECTION chrome: no ModeHeader, no TabBar (chrome.ts) */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)" }}>
          <div style={{ padding: "20px 18px 8px" }}>
            <div className="u-kicker" style={{ marginBottom: 6 }}>Vol. 1 · Setup</div>
            <div className="u-serif" style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Choose how <em>_underscore</em> remembers.
            </div>
            <div className="u-serif" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic" }}>
              Two families. Three modes. Switchable anytime.
            </div>
          </div>
          <div className="u-rule" style={{ margin: "12px 18px 0" }} />
          <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>Guest</div>
          <div className="u-mono" style={{ padding: "6px 18px 10px", fontSize: 10, color: "var(--ink-3)" }}>
            Signed in — switch between Account (Free) and Account (Paid) below.
          </div>
          <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>In the cloud</div>
          {cloud.map((m) => (
            <button key={m.id} onClick={() => setSel(m.id)} style={{
              all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box",
              padding: "12px 18px", borderBottom: "1px solid var(--rule-soft)",
              background: sel === m.id ? "var(--paper-2)" : "transparent",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="u-serif" style={{ fontSize: 17 }}>{m.name}</div>
                <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{sel === m.id ? "●" : "○"}</span>
              </div>
              <div className="u-serif" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, fontStyle: "italic" }}>{m.description}</div>
            </button>
          ))}
          <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--rule)", display: "flex", gap: 8 }}>
            <button className="btn ghost sm" style={{ flex: 1 }}>Later</button>
            <button className="btn accent sm" style={{ flex: 2 }}>Continue as {active.name} →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RECOMMENDED — Settings authed: Free/Paid inline (1 tap)
   Mirrors Typography expand pattern + account plan pills.
   ═══════════════════════════════════════════════════════════ */

function Settings_Rec_Authed({ initial = "pro" }) {
  const [mode, setMode] = useStateMI(initial);
  const [open, setOpen] = useStateMI(true); // default open when arriving via intent; else collapsed summary
  const b = BRAND[mode];

  return (
    <ProdShell title="_underscore · settings" modeId={mode} showSwitch={false}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "12px 16px 6px" }}>
          <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Settings</div>
        </div>
        <div className="list-scroll" style={{ flex: 1, minHeight: 0 }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)",
            display: "grid", gridTemplateColumns: "1fr auto", minHeight: 44,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Typography</div>
              <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>Editorial</div>
            </div>
            <MonoTrail>▸</MonoTrail>
          </div>

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>General</div>
          <Row title="Theme" sub="Match system" right={<MonoTrail>system</MonoTrail>} />

          {/* Mode — Typography-style expand. Content = only Free / Paid. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            style={{
              all: "unset", cursor: "pointer", display: "grid",
              gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center",
              width: "100%", boxSizing: "border-box",
              padding: "12px 16px",
              borderBottom: "1px solid var(--rule-soft)",
              background: open ? "var(--paper-2)" : "transparent",
              minHeight: 44, textAlign: "left",
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>Mode</div>
              <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
                {b.name} · {b.tagline.toLowerCase()}
              </div>
            </div>
            <span className="u-mono" style={{ fontSize: 10, color: open ? "var(--accent)" : "var(--ink-3)" }}>
              {open ? "▾" : "▸"}
            </span>
          </button>

          {open && (
            <div style={{ background: "var(--paper-2)", borderBottom: "1px solid var(--rule-soft)" }}>
              <div className="u-mono" style={{
                fontSize: 9, color: "var(--ink-4)", padding: "10px 16px 4px",
                letterSpacing: "0.12em", textTransform: "uppercase",
              }}>
                Applies immediately · signed-in plans only
              </div>
              {[BRAND.pro, BRAND.pro_xai].map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    style={{
                      all: "unset", cursor: "pointer", display: "block",
                      width: "100%", boxSizing: "border-box",
                      padding: "12px 16px",
                      borderTop: "1px solid var(--rule-soft)",
                      background: active ? "var(--utility-overlay-06)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: active ? "var(--ink)" : "var(--ink-2)" }}>
                          {m.name}
                        </div>
                        <PlanPill modeId={m.id} />
                      </div>
                      <span className="u-mono" style={{ fontSize: 10, color: active ? "var(--accent)" : "var(--ink-3)" }}>
                        {active ? "● active" : "○"}
                      </span>
                    </div>
                    <div className="u-serif" style={{
                      fontSize: 12, color: "var(--ink-3)", marginTop: 4, fontStyle: "italic", lineHeight: 1.4,
                    }}>
                      {m.description}
                    </div>
                  </button>
                );
              })}
              <div className="u-mono" style={{
                fontSize: 9, color: "var(--ink-4)", padding: "8px 16px 12px",
                letterSpacing: "0.06em",
              }}>
                Guest is only available when signed out · use Sign out below
              </div>
            </div>
          )}

          <Row title="Density" sub="Comfortable" right={<MonoTrail>Edit</MonoTrail>} />

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Library</div>
          <Row title="Sync library" sub="Pull latest highlights from cloud" right={<MonoTrail accent>Sync</MonoTrail>} />

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>AI</div>
          <Row
            title="Connect to AI"
            sub="External agents"
            right={<span style={{ color: "var(--ink-3)", fontSize: 14 }}>{mode === "pro_xai" ? "›" : "🔒"}</span>}
          />
          <Row
            title="Configure AI providers"
            sub="In-app models"
            right={<span style={{ color: "var(--ink-3)", fontSize: 14 }}>{mode === "pro_xai" ? "›" : "🔒"}</span>}
          />

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Account</div>
          <Row
            title="alex@weekly.co"
            sub={`${b.name} · ${b.tagline.toLowerCase()}`}
            right={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <PlanPill modeId={mode} />
                <MonoTrail>Sign out</MonoTrail>
              </span>
            }
          />
        </div>
      </div>
    </ProdShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   RECOMMENDED — Settings guest: Mode is status; Sign in is the path
   ═══════════════════════════════════════════════════════════ */

function Settings_Rec_Guest() {
  return (
    <ProdShell title="_underscore · settings" modeId="basic" showSwitch={false}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "12px 16px 6px" }}>
          <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Settings</div>
        </div>
        <div className="list-scroll" style={{ flex: 1, minHeight: 0 }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)",
            display: "grid", gridTemplateColumns: "1fr auto", minHeight: 44,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Typography</div>
              <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>Editorial</div>
            </div>
            <MonoTrail>▸</MonoTrail>
          </div>

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>General</div>
          <Row title="Theme" sub="Match system" right={<MonoTrail>system</MonoTrail>} />

          {/* Not a switcher — usePersistedMode refuses pro* while logged out */}
          <Row
            title="Mode"
            sub="Guest · local only · this device"
            right={<MonoTrail>Local</MonoTrail>}
          />
          <div className="u-serif" style={{
            fontSize: 12, color: "var(--ink-3)", fontStyle: "italic",
            padding: "8px 16px 12px", borderBottom: "1px solid var(--rule-soft)",
            lineHeight: 1.4,
          }}>
            Sync, export, and AI unlock when you sign in. Use Account below — no separate mode page.
          </div>

          <Row title="Density" sub="Comfortable" right={<MonoTrail>Edit</MonoTrail>} />

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>AI</div>
          <Row title="Connect to AI" sub="External agents" right={<MonoTrail>Locked</MonoTrail>} />
          <Row title="Configure AI providers" sub="In-app models" right={<MonoTrail>Locked</MonoTrail>} />

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Account</div>
          <Row
            title="Not signed in"
            sub="Sync library across devices, export, AI"
            right={<MonoTrail accent>Sign in</MonoTrail>}
          />
        </div>
      </div>
    </ProdShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   RECOMMENDED — always-open Free/Paid (zero expand click)
   Best click budget when user is already in Settings.
   ═══════════════════════════════════════════════════════════ */

function Settings_Rec_AlwaysOpen() {
  const [mode, setMode] = useStateMI("pro");
  const b = BRAND[mode];
  return (
    <ProdShell title="_underscore · settings" modeId={mode} showSwitch={false}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "12px 16px 6px" }}>
          <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Settings</div>
        </div>
        <div className="list-scroll" style={{ flex: 1, minHeight: 0 }}>
          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>General</div>
          <Row title="Theme" sub="Match system" right={<MonoTrail>system</MonoTrail>} />

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Mode</div>
          <div className="u-mono" style={{
            fontSize: 9, color: "var(--ink-4)", padding: "0 16px 6px",
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            {b.tagline} · tap to apply
          </div>
          {[BRAND.pro, BRAND.pro_xai].map((m) => {
            const active = mode === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setMode(m.id)} style={{
                all: "unset", cursor: "pointer", display: "grid",
                gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12,
                width: "100%", boxSizing: "border-box",
                padding: "14px 16px",
                borderBottom: "1px solid var(--rule-soft)",
                background: active ? "var(--paper-2)" : "transparent",
                minHeight: 44, textAlign: "left",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", display: "flex", gap: 8, alignItems: "center" }}>
                    {m.name}
                    <PlanPill modeId={m.id} />
                  </div>
                  <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
                    {m.tagline}
                  </div>
                </div>
                <span className="u-mono" style={{ fontSize: 10, color: active ? "var(--accent)" : "var(--ink-3)" }}>
                  {active ? "●" : "○"}
                </span>
              </button>
            );
          })}

          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Account</div>
          <Row
            title="alex@weekly.co"
            sub={`${b.name} · ${b.tagline.toLowerCase()}`}
            right={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <PlanPill modeId={mode} />
                <MonoTrail>Sign out</MonoTrail>
              </span>
            }
          />
        </div>
      </div>
    </ProdShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING — production today vs recommended
   ═══════════════════════════════════════════════════════════ */

function Onboard_Today_Flow() {
  const steps = [
    { n: "1", t: "Welcome", d: "WelcomePage · Get started →" },
    { n: "2", t: "MODE_SELECTION", d: "Forced if !hasSeenModeSelection" },
    { n: "3", t: "Pick + Continue", d: "Two-step confirm even for Guest" },
    { n: "4", t: "COLLECTIONS", d: "Finally highlight-ready" },
  ];
  return (
    <div className="ue" style={{ width: 400, background: "var(--paper)", border: "1px solid var(--rule)", padding: 18 }}>
      <div className="u-kicker" style={{ marginBottom: 6 }}>Today · resolvePopupInitialRoute</div>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>Four beats before value</div>
      <div className="u-rule" style={{ margin: "12px 0" }} />
      {steps.map((s) => (
        <div key={s.n} style={{
          display: "grid", gridTemplateColumns: "28px 1fr", gap: 10,
          padding: "10px 0", borderBottom: "1px dotted var(--rule-soft)",
        }}>
          <div className="u-mono" style={{ fontSize: 12, color: "var(--accent)" }}>{s.n}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.t}</div>
            <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{s.d}</div>
          </div>
        </div>
      ))}
      <div className="u-serif" style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", marginTop: 12, lineHeight: 1.4 }}>
        Logout also forces MODE_SELECTION (handleLogout → persistPopupView). usePersistedMode already defaults guests to basic.
      </div>
    </div>
  );
}

function Onboard_Rec_Welcome() {
  return (
    <div className="ue" style={{ width: 400 }}>
      <ProdTitleStrip title="_underscore" modeId="basic" />
      <div className="popup" style={{ borderTop: "none", height: 560, display: "flex", flexDirection: "column" }}>
        {/* WELCOME chrome: no ModeHeader, no TabBar — matches chrome.ts */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "48px 24px", textAlign: "center", position: "relative",
        }}>
          <div className="u-serif" style={{ fontSize: 36, letterSpacing: "-0.035em", lineHeight: 1 }}>underscore</div>
          <div className="u-sans" style={{
            fontSize: 12, color: "var(--ink-2)", marginTop: 16, lineHeight: 1.5, maxWidth: 200,
          }}>
            Highlight what matters.<br />Everything else fades away.
          </div>
          <button className="btn accent" style={{ marginTop: 36, padding: "10px 32px" }}>
            Start highlighting →
          </button>
          <button className="btn ghost sm" style={{ marginTop: 10 }}>
            I have an account
          </button>
          <div className="u-mono" style={{
            marginTop: 20, fontSize: 9, color: "var(--ink-3)",
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            Free forever · No ads · Private by default
          </div>
          <div className="u-serif" style={{
            marginTop: 18, fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", maxWidth: 240, lineHeight: 1.4,
          }}>
            Starts in Guest. Plan (Free / Paid) is a Settings choice after you sign in.
          </div>
        </div>
      </div>
    </div>
  );
}

function Onboard_Rec_LibraryEmpty() {
  // Mirrors LibraryEmptyGuest.tsx structure
  return (
    <ProdShell title="_underscore · library" modeId="basic" showSwitch={false} activeTab="collections">
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "12px 16px 6px" }}>
          <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Library</div>
          <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
            Guest · 0 domains · 0 highlights
          </div>
        </div>
        <div style={{ flex: 1, padding: "6px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: 12, border: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
            <div className="u-kicker">No highlights yet</div>
            <div className="u-serif" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
              Read anything lately? Highlight a phrase to begin — or sign in to load your cloud library.
            </div>
            <button type="button" className="btn accent sm" style={{ marginTop: 10 }}>Sign in</button>
          </div>
          <div style={{ padding: 12, border: "1px dashed var(--rule-soft)" }}>
            <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Keyboard
            </div>
            <div className="u-serif" style={{ fontSize: 13, marginTop: 4 }}>
              Select text · press <span className="u-mono">⌘↩</span>
            </div>
          </div>
        </div>
      </div>
    </ProdShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   Spec cards grounded in code symbols
   ═══════════════════════════════════════════════════════════ */

function ModeClickBudget() {
  const rows = [
    { path: "Today authed: Switch › → page → pick → Continue", clicks: "4", bad: true },
    { path: "Today authed: Settings → Change → page → Continue", clicks: "5", bad: true },
    { path: "Today guest Settings Mode row", clicks: "—", bad: true },
    { path: "Rec authed in Settings: tap Free/Paid", clicks: "1", bad: false },
    { path: "Rec authed from Library: Settings → tap plan", clicks: "2", bad: false },
    { path: "Rec first-run: Welcome → Start (Guest)", clicks: "1", bad: false },
    { path: "Rec guest → cloud: Account Sign in", clicks: "1+", bad: false },
  ];
  return (
    <div className="ue" style={{ width: 400, background: "var(--paper)", border: "1px solid var(--rule)", padding: 18 }}>
      <div className="u-kicker" style={{ marginBottom: 6 }}>Interaction budget</div>
      <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
        Mode is not a room.<br />For authed users it is Free / Paid.
      </div>
      <div className="u-rule" style={{ margin: "14px 0 8px" }} />
      {rows.map((r) => (
        <div key={r.path} style={{
          display: "grid", gridTemplateColumns: "1fr auto", gap: 12,
          padding: "10px 0", borderBottom: "1px dotted var(--rule-soft)", alignItems: "baseline",
        }}>
          <div className="u-serif" style={{
            fontSize: 13,
            color: r.bad ? "var(--ink-3)" : "var(--ink)",
            fontStyle: r.bad ? "italic" : "normal",
            textDecoration: r.bad ? "line-through" : "none",
          }}>{r.path}</div>
          <div className="u-mono" style={{ fontSize: 11, color: r.bad ? "var(--ink-3)" : "var(--accent)" }}>{r.clicks}</div>
        </div>
      ))}
    </div>
  );
}

function ModeBehaviorSpec() {
  const rules = [
    { k: "Constraint", v: "usePersistedMode: guest↛pro*; authed↛basic. UI must not offer illegal picks." },
    { k: "Authed UI", v: "Settings inline Free ↔ Paid. Immediate setMode. No Continue. No MODE_SELECTION." },
    { k: "Guest UI", v: "Mode row status-only (keep today’s non-click). Cloud path = Account Sign in." },
    { k: "Header", v: "Remove onSwitch from buildChrome. ModeHeader status only." },
    { k: "Welcome", v: "Start → set seen flags + basic + COLLECTIONS. Optional “I have an account” → AUTH." },
    { k: "Route", v: "resolvePopupInitialRoute: drop hasSeenModeSelection branch; never return MODE_SELECTION." },
    { k: "Logout", v: "handleLogout → basic + stay SETTINGS or COLLECTIONS. Stop persist MODE_SELECTION." },
    { k: "Confirm", v: "pro↔pro_xai needs no confirm (matrix). Skip 1800ms fake delay in settings path." },
    { k: "Web /mode", v: "Redirect to /settings (expand Mode). Retire ModeSelectionRoute as destination." },
    { k: "Pattern", v: "TypographySettings expand or always-open rows — same Row/mono tokens as SettingsPage." },
  ];
  return (
    <div className="ue" style={{ width: 400, background: "var(--paper)", border: "1px solid var(--rule)", padding: "18px 18px 10px" }}>
      <div className="u-kicker" style={{ marginBottom: 6 }}>Behavior contract · from code</div>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>Ship against runtime rules</div>
      <div className="u-rule" style={{ margin: "14px 0 4px" }} />
      {rules.map((r) => (
        <div key={r.k} style={{
          display: "grid", gridTemplateColumns: "88px 1fr", gap: 10,
          padding: "9px 0", borderBottom: "1px dotted var(--rule-soft)",
        }}>
          <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", paddingTop: 2 }}>{r.k}</div>
          <div className="u-serif" style={{ fontSize: 13, lineHeight: 1.4 }}>{r.v}</div>
        </div>
      ))}
    </div>
  );
}

function ModeHeaderCompare() {
  return (
    <div className="ue" style={{ width: 400, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div style={{ padding: "14px 16px 8px" }}>
        <div className="u-kicker">ModeHeader.tsx + chrome.ts</div>
        <div className="u-serif" style={{ fontSize: 18, marginTop: 4 }}>Drop Switch ›</div>
      </div>
      <div style={{ padding: "8px 16px" }}>
        <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
          Today — onSwitch: handleSettingsChangeMode
        </div>
        <div style={{ border: "1px solid var(--rule-soft)" }}>
          <ProdModeHeader modeId="pro" showSwitch />
        </div>
      </div>
      <div style={{ padding: "16px 16px 18px" }}>
        <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
          Recommended — omit onSwitch
        </div>
        <div style={{ border: "1px solid var(--rule)" }}>
          <ProdModeHeader modeId="pro" showSwitch={false} />
        </div>
        <div className="u-serif" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10, fontStyle: "italic" }}>
          Plan changes live next to Account + AI gates in Settings — one owner.
        </div>
      </div>
    </div>
  );
}

function GraphifyNotes() {
  const notes = [
    { k: "Hub", v: "ModeType bridges Popup App Bootstrap ↔ Mode Selection UI ↔ mode-capabilities" },
    { k: "Dead ends", v: "MODE_SELECTION is a full view with no TabBar — traps users outside primary IA" },
    { k: "Settings edge", v: "SettingsPage → onChangeMode only; no setMode call site in the page today" },
    { k: "Persist edge", v: "usePersistedMode owns legal transitions; UI must call it, not invent a third picker" },
    { k: "Duplicate UI", v: "features/modes/* and ui-system/pages/ModeSelection* + composed ModeSelector (legacy Tailwind)" },
  ];
  return (
    <div className="ue" style={{ width: 400, background: "var(--paper)", border: "1px solid var(--rule)", padding: 18 }}>
      <div className="u-kicker" style={{ marginBottom: 6 }}>graphify · mode cluster</div>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>What the graph implies</div>
      <div className="u-rule" style={{ margin: "12px 0 4px" }} />
      {notes.map((n) => (
        <div key={n.k} style={{
          display: "grid", gridTemplateColumns: "88px 1fr", gap: 10,
          padding: "9px 0", borderBottom: "1px dotted var(--rule-soft)",
        }}>
          <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>{n.k}</div>
          <div className="u-serif" style={{ fontSize: 13, lineHeight: 1.4 }}>{n.v}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  Settings_Today_Authed,
  ModePage_Today_Authed,
  Settings_Rec_Authed,
  Settings_Rec_Guest,
  Settings_Rec_AlwaysOpen,
  Onboard_Today_Flow,
  Onboard_Rec_Welcome,
  Onboard_Rec_LibraryEmpty,
  ModeClickBudget,
  ModeBehaviorSpec,
  ModeHeaderCompare,
  GraphifyNotes,
  // keep old names from prior mock so index does not explode if referenced
  SettingsMode_Recommended: Settings_Rec_Authed,
  SettingsMode_AntiPattern: Settings_Today_Authed,
  SettingsMode_Expand: Settings_Rec_Authed,
  Onboard_Welcome: Onboard_Rec_Welcome,
  Onboard_FirstLibrary: Onboard_Rec_LibraryEmpty,
});
