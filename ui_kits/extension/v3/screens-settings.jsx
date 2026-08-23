// Settings · Auth · Typography — mode lives here (not a full-page picker).

const { PopupShell, Seg, Switch, Row, Btn, modeById } = window.V3;

function SettingsHead() {
  return (
    <div className="settings-head">
      <h2 className="settings-title">Settings</h2>
      <button type="button" className="settings-close" aria-label="Close settings">
        ×
      </button>
    </div>
  );
}

function ModeSection({ modeId = "basic" }) {
  const m = modeById(modeId);
  return (
    <div className="mode-section" style={{ padding: "8px 16px 12px" }}>
      <div className="u-caps" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
        Plan
      </div>
      <div className="seg" role="radiogroup" aria-label="Plan">
        {["Guest", "Starter", "Pro"].map((label) => {
          const active =
            (label === "Guest" && modeId === "basic") ||
            (label === "Starter" && modeId === "pro") ||
            (label === "Pro" && modeId === "pro_xai");
          return (
            <button key={label} type="button" className={active ? "active" : ""} role="radio" aria-checked={active}>
              {label}
            </button>
          );
        })}
      </div>
      <ul className="ui-cap-list" style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
        <li className="ui-cap">{m.caps.sync ? "Sync on" : "Local only"}</li>
        <li className="ui-cap">{m.caps.export ? "Export on" : "Export off"}</li>
        <li className="ui-cap">{m.caps.ai ? "Ask + models" : "AI locked"}</li>
      </ul>
    </div>
  );
}

function SettingsGuest() {
  return (
    <PopupShell title="_underscore · settings" modeId="basic" activeTab="settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <SettingsHead />
        <div className="list-scroll" style={{ flex: 1, overflow: "auto" }}>
          <div className="local-status-card" role="region" aria-label="Local only status">
            <div className="ls-kicker">Local only</div>
            <div className="ls-title">Highlights stay on this device</div>
            <div className="ls-body">Sign in for free sync &amp; export.</div>
            <div className="ls-actions">
              <Btn variant="accent" size="sm">
                Sign in
              </Btn>
              <Btn variant="ghost" size="sm">
                Starter
              </Btn>
            </div>
          </div>
          <ModeSection modeId="basic" />
          <button type="button" className="row">
            <div>
              <div className="title">Typography</div>
              <div className="sub">Editorial · Source Serif 4</div>
            </div>
            <span className="trail">▸</span>
          </button>
          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
            Appearance
          </div>
          <div style={{ padding: "8px 16px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="title" style={{ fontSize: 14, fontWeight: 500 }}>
                Theme
              </div>
              <span className="ui-status plain">Light</span>
            </div>
            <Seg options={["light", "dark", "system"]} value="light" />
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function SettingsStarter() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro" activeTab="settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <SettingsHead />
        <div className="list-scroll" style={{ flex: 1, overflow: "auto" }}>
          <div className="row" style={{ cursor: "default" }}>
            <div>
              <div className="title">Alex</div>
              <div className="sub">alex@example.com</div>
            </div>
            <span className="plan-pill">Starter</span>
          </div>
          <ModeSection modeId="pro" />
          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
            Library
          </div>
          <div className="row" style={{ cursor: "default" }}>
            <div>
              <div className="title">Cloud sync</div>
              <div className="sub">Up to date</div>
            </div>
            <Switch on />
          </div>
          <button type="button" className="row">
            <div>
              <div className="title">Export</div>
              <div className="sub">Markdown</div>
            </div>
            <span className="trail">▸</span>
          </button>
          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
            AI
          </div>
          <button type="button" className="row">
            <div>
              <div className="title">Connect to AI</div>
              <div className="sub">Needs Account (Paid)</div>
            </div>
            <span className="trail">▸</span>
          </button>
          <button type="button" className="row">
            <div>
              <div className="title">Sign out</div>
              <div className="sub">Stay local on this device</div>
            </div>
          </button>
        </div>
      </div>
    </PopupShell>
  );
}

function SettingsPro() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro_xai" activeTab="settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <SettingsHead />
        <div className="list-scroll" style={{ flex: 1, overflow: "auto" }}>
          <div className="row" style={{ cursor: "default" }}>
            <div>
              <div className="title">Alex</div>
              <div className="sub">alex@example.com</div>
            </div>
            <span className="plan-pill">Pro</span>
          </div>
          <ModeSection modeId="pro_xai" />
          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
            Library
          </div>
          <div className="row" style={{ cursor: "default" }}>
            <div>
              <div className="title">Cloud sync</div>
              <div className="sub">Up to date</div>
            </div>
            <span className="u-mono" style={{ fontSize: 10, color: "var(--synced)" }}>
              Synced
            </span>
          </div>
          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
            AI
          </div>
          <button type="button" className="row">
            <div>
              <div className="title">Connect to AI</div>
              <div className="sub">xAI · Grok · ready</div>
            </div>
            <span className="trail">▸</span>
          </button>
          <button type="button" className="row">
            <div>
              <div className="title">Models</div>
              <div className="sub">Default for Ask</div>
            </div>
            <span className="trail">▸</span>
          </button>
        </div>
      </div>
    </PopupShell>
  );
}

function SettingsTypography() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro" activeTab="settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <SettingsHead />
        <div className="list-scroll" style={{ flex: 1, overflow: "auto" }}>
          <button type="button" className="row" style={{ background: "var(--paper-2)" }}>
            <div>
              <div className="title">Typography</div>
              <div className="sub">Editorial · Source Serif 4</div>
            </div>
            <span className="trail">▾</span>
          </button>
          <div className="type-sec" style={{ padding: "8px 16px 16px" }}>
            <div className="type-sec-head u-mono">Preset</div>
            <div className="preset-scroll" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {["Editorial", "Classic", "Modern", "Humanist"].map((p, i) => (
                <button key={p} type="button" className={`preset-chip ${i === 0 ? "active" : ""}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="specimen" style={{ marginTop: 16, padding: 12, border: "1px solid var(--rule-soft)" }}>
              <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
                Reading list
              </div>
              <div className="u-sans" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
                Interface chrome stays quiet so the quote can lead.
              </div>
              <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                domain · section · 3h
              </div>
            </div>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function AuthSignIn() {
  return (
    <PopupShell title="_underscore · sign in" modeId="basic" showModePill={false} showTabs={false}>
      <div className="screen-enter auth-screen">
        <main className="auth-body">
          <div>
            <h1 className="auth-title u-serif">Sign in</h1>
            <p className="auth-sub u-sans">Starter</p>
          </div>
          <button type="button" className="btn accent" style={{ width: "100%" }}>
            Continue with Google
          </button>
          <div className="divider-or">
            <span>or</span>
          </div>
          <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={(e) => e.preventDefault()}>
            <div className="field">
              <label htmlFor="v3-email">Email</label>
              <input id="v3-email" type="email" defaultValue="alex@example.com" readOnly />
            </div>
            <div className="field">
              <label htmlFor="v3-pass">Password</label>
              <input id="v3-pass" type="password" defaultValue="••••••••" readOnly />
              <div className="auth-field-footer">
                <button type="button" className="auth-text-link">
                  Forgot password?
                </button>
              </div>
            </div>
            <button type="submit" className="btn primary" style={{ width: "100%" }}>
              Sign in
            </button>
          </form>
          <p className="auth-footer-row u-sans">
            <span>New here?</span>
            <button type="button" className="auth-text-link accent">
              Create account
            </button>
          </p>
        </main>
      </div>
    </PopupShell>
  );
}

function AuthRegister() {
  return (
    <PopupShell title="_underscore · create account" modeId="basic" showModePill={false} showTabs={false}>
      <div className="screen-enter auth-screen">
        <main className="auth-body">
          <div>
            <h1 className="auth-title u-serif">Create account</h1>
            <p className="auth-sub u-sans">Starter is free — sync and export.</p>
          </div>
          <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={(e) => e.preventDefault()}>
            <div className="field">
              <label htmlFor="v3-reg-email">Email</label>
              <input id="v3-reg-email" type="email" placeholder="you@example.com" readOnly />
            </div>
            <div className="field">
              <label htmlFor="v3-reg-pass">Password</label>
              <input id="v3-reg-pass" type="password" placeholder="••••••••" readOnly />
            </div>
            <button type="submit" className="btn primary" style={{ width: "100%" }}>
              Create account
            </button>
          </form>
          <p className="auth-footer-row u-sans">
            <span>Already have an account?</span>
            <button type="button" className="auth-text-link accent">
              Sign in
            </button>
          </p>
        </main>
      </div>
    </PopupShell>
  );
}

function AuthReset() {
  return (
    <PopupShell title="_underscore · reset password" modeId="basic" showModePill={false} showTabs={false}>
      <div className="screen-enter auth-screen">
        <main className="auth-body">
          <div>
            <h1 className="auth-title u-serif">Reset password</h1>
            <p className="auth-sub u-sans">We sent a code to alex@example.com</p>
          </div>
          <div className="auth-steps" aria-hidden="true">
            <span className="step active" />
            <span className="step active" />
            <span className="step" />
          </div>
          <div className="field">
            <label htmlFor="v3-code">Code</label>
            <input id="v3-code" className="auth-code-input" defaultValue="482 913" readOnly />
          </div>
          <button type="button" className="btn primary" style={{ width: "100%" }}>
            Verify code
          </button>
          <p className="auth-footer-row u-sans">
            <button type="button" className="nav-back">
              ← Sign in
            </button>
          </p>
        </main>
      </div>
    </PopupShell>
  );
}

window.V3Settings = {
  SettingsGuest,
  SettingsStarter,
  SettingsPro,
  SettingsTypography,
  AuthSignIn,
  AuthRegister,
  AuthReset,
};
