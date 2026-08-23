// Connect to AI · Models — Pro surface (MCP / providers).

const { PopupShell, Btn, Switch } = window.V3;

function ConnectHubLocked() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro" activeTab="settings" backLabel="Settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "14px 16px 8px" }}>
          <div className="page-kicker u-mono">AI</div>
          <h2 className="page-title u-serif" style={{ margin: "2px 0 0", fontSize: 22 }}>
            Connect to AI
          </h2>
        </div>
        <div className="list-scroll" style={{ flex: 1, overflow: "auto", padding: "8px 16px 24px" }}>
          <div className="lock-card">
            <div className="lc-title u-serif">Account (Paid) required</div>
            <p className="lc-body">
              Ask and provider keys need a paid account. Checkout runs on Polar.
            </p>
            <Btn variant="accent" size="sm">
              Upgrade
            </Btn>
          </div>
          <div className="u-caps" style={{ marginTop: 20, color: "var(--ink-3)" }}>
            Providers
          </div>
          {["xAI", "OpenAI", "Anthropic", "Cursor"].map((name) => (
            <div key={name} className="prov-card is-muted" style={{ opacity: 0.55 }}>
              <div className="prov-head">
                <span className="title">{name}</span>
                <span className="ui-status plain">Pro</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

function ConnectHubPro() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro_xai" activeTab="settings" backLabel="Settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "14px 16px 8px" }}>
          <div className="page-kicker u-mono">AI</div>
          <h2 className="page-title u-serif" style={{ margin: "2px 0 0", fontSize: 22 }}>
            Connect to AI
          </h2>
          <p className="u-sans" style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-3)" }}>
            API keys store in chrome.storage.local on this device.
          </p>
        </div>
        <div className="list-scroll" style={{ flex: 1, overflow: "auto", padding: "4px 16px 24px" }}>
          <div className="prov-card">
            <div className="prov-head">
              <span className="title">xAI</span>
              <span className="ui-status plain" style={{ color: "var(--synced)" }}>
                Ready
              </span>
            </div>
            <div className="prov-body">
              <div className="sub">Grok · default for Ask</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn variant="ghost" size="sm">
                  Configure
                </Btn>
                <Btn variant="ghost" size="sm">
                  Check
                </Btn>
              </div>
            </div>
          </div>
          <div className="prov-card">
            <div className="prov-head">
              <span className="title">OpenAI</span>
              <span className="ui-status plain">Not connected</span>
            </div>
            <div className="prov-body">
              <Btn variant="ghost" size="sm">
                Connect
              </Btn>
            </div>
          </div>
          <div className="prov-card">
            <div className="prov-head">
              <span className="title">Anthropic</span>
              <span className="ui-status plain">Not connected</span>
            </div>
            <div className="prov-body">
              <Btn variant="ghost" size="sm">
                Connect
              </Btn>
            </div>
          </div>
          <div className="bridge-card" style={{ marginTop: 16 }}>
            <div className="title">MCP bridge</div>
            <div className="sub">Serve this library to local MCP clients.</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="ui-status plain">Off</span>
              <Switch on={false} />
            </div>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function ConnectSetup() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro_xai" activeTab="settings" backLabel="Connect to AI">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "14px 16px 8px" }}>
          <div className="page-kicker u-mono">Provider</div>
          <h2 className="page-title u-serif" style={{ margin: "2px 0 0", fontSize: 22 }}>
            xAI
          </h2>
        </div>
        <div className="list-scroll" style={{ flex: 1, overflow: "auto", padding: "8px 16px 24px" }}>
          <label className="field-chip">
            <span className="u-mono">API key</span>
            <input className="field" type="password" defaultValue="xai-••••••••••••" readOnly />
          </label>
          <div className="token-row" style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Btn variant="ghost" size="sm">
              Paste
            </Btn>
            <Btn variant="ghost" size="sm">
              Clear
            </Btn>
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn variant="primary" size="sm">
              Save &amp; check
            </Btn>
          </div>
          <div className="check-result done" style={{ marginTop: 14 }}>
            Connection ok · models listed
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function ModelsView() {
  const models = [
    { id: "grok-2", name: "Grok 2", provider: "xAI", active: true },
    { id: "grok-2-mini", name: "Grok 2 Mini", provider: "xAI", active: false },
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", active: false },
  ];
  return (
    <PopupShell title="_underscore · models" modeId="pro_xai" activeTab="settings" backLabel="Connect to AI">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "14px 16px 8px" }}>
          <div className="page-kicker u-mono">Ask</div>
          <h2 className="page-title u-serif" style={{ margin: "2px 0 0", fontSize: 22 }}>
            Models
          </h2>
          <p className="u-sans" style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-3)" }}>
            Used for Ask and summarize.
          </p>
        </div>
        <div className="list-scroll" style={{ flex: 1, overflow: "auto" }}>
          {models.map((m) => (
            <button key={m.id} type="button" className={`row model-opt ${m.active ? "selected" : ""}`}>
              <div>
                <div className="title">{m.name}</div>
                <div className="sub">{m.provider}</div>
              </div>
              {m.active ? (
                <span className="u-mono" style={{ fontSize: 10, color: "var(--accent)" }}>
                  Default
                </span>
              ) : (
                <span className="trail">○</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

function InsightsCardDemo() {
  return (
    <PopupShell title="_underscore · library" modeId="pro_xai" activeTab="collections" backLabel="Library">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "12px 16px" }}>
          <h2 className="u-serif" style={{ margin: 0, fontSize: 20 }}>
            developer.mozilla.org
          </h2>
        </div>
        <div style={{ padding: "0 16px" }}>
          <div className="insights-card">
            <div className="insp-bar">
              <span className="u-mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Insight
              </span>
              <button type="button" className="insp-btn">
                Refresh
              </button>
            </div>
            <p className="u-serif" style={{ fontSize: 15, lineHeight: 1.4, margin: "8px 0 0" }}>
              5 highlights on cascade and specificity. Two notes; tags: css, fundamentals.
            </p>
            <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 8 }}>
              From 5 highlights · not live
            </div>
          </div>
        </div>
        <div className="list-scroll" style={{ flex: 1, marginTop: 8 }}>
          <div className="u-caps" style={{ padding: "8px 16px", color: "var(--ink-3)" }}>
            Sections
          </div>
          <div className="row">
            <div>
              <div className="title u-mono" style={{ fontSize: 12 }}>
                /en-US/docs/Web/CSS
              </div>
              <div className="sub">5 highlights</div>
            </div>
            <span className="trail">›</span>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

window.V3Ai = {
  ConnectHubLocked,
  ConnectHubPro,
  ConnectSetup,
  ModelsView,
  InsightsCardDemo,
};
