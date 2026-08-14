// Connect to AI — host handoff artboards (PRD 2026-08-14)
// Hub: status + Active + Add an AI app + Server details
// Setup: steps + primary handoff + Manual / Advanced
// No body serif titles; PopupShell owns chrome title only.

function McpFrame({ title, pageTitle, backLabel, children, dark }) {
  return (
    <PopupFrame dark={dark} title={title} mode="cloud">
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)",
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", minHeight: 44,
      }}>
        <span className="u-mono" style={{ fontSize: 10, color: "var(--accent)" }}>{backLabel || "← Settings"}</span>
        <span className="u-sans" style={{ fontSize: 12, fontWeight: 500, textAlign: "center" }}>{pageTitle}</span>
        <span />
      </div>
      <div className="list-scroll" style={{ flex: 1 }}>{children}</div>
    </PopupFrame>
  );
}

function LockGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="var(--ink)" strokeWidth="1.25" />
      <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" stroke="var(--ink)" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" stroke="var(--ink)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsAiList({ dark, locked }) {
  return (
    <PopupFrame dark={dark} title="_underscore · settings" mode="cloud">
      <div style={{ padding: "12px 16px 6px" }}>
        <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Settings</div>
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink)" }}>General</div>
      <Row title="Theme" sub="Match system" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink)" }}>System</span>} />
      <Row title="Mode" sub={locked ? "Guest" : "Account (Paid)"} right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink)" }}>{locked ? "Local" : "Change"}</span>} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink)" }}>AI</div>
      <Row
        title="Integrations"
        sub="External agents"
        right={locked ? <LockGlyph /> : <ChevronGlyph />}
      />
      <Row
        title="Configure AI providers"
        sub="In-app models"
        right={locked ? <LockGlyph /> : <ChevronGlyph />}
      />
    </PopupFrame>
  );
}

function McpHubLocked({ dark, tier }) {
  const isGuest = tier === "guest";
  return (
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Integrations" backLabel="← Settings">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.45 }}>
          Use your highlights in the agent you already use. OAuth happens in your agent — not in this app.
        </div>
      </div>
      <div style={{ margin: "0 16px 10px", padding: 14, border: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
        <div className="u-sans" style={{ fontSize: 14, fontWeight: 500 }}>Included with Account (Paid)</div>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink)", marginTop: 6, lineHeight: 1.45 }}>
          You connect your own AI — no token cost from _underscore.
        </div>
        <button className="u-caps" style={{ marginTop: 10, width: "100%", minHeight: 44, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--paper)" }}>
          {isGuest ? "Sign in to continue" : "Upgrade in Settings"}
        </button>
      </div>
      <div style={{ margin: "0 16px 10px", padding: 12, border: "1px solid var(--rule)", opacity: 0.65 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
          <div>
            <div className="u-sans" style={{ fontSize: 14, fontWeight: 500 }}>Status</div>
            <div className="u-mono" style={{ fontSize: 10, marginTop: 4 }}>Off until Account (Paid)</div>
          </div>
          <span className="u-mono" style={{ fontSize: 10 }}>Off</span>
        </div>
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink)" }}>Active</div>
      <div className="u-sans" style={{ fontSize: 12, color: "var(--ink)", padding: "8px 16px 12px" }}>
        Connections unlock with Account (Paid).
      </div>
      <div style={{ padding: "8px 16px 16px" }}>
        <button className="u-caps" style={{ width: "100%", minHeight: 44, border: "1px solid var(--rule)", background: "var(--paper-2)", color: "var(--ink)" }}>Add an AI app</button>
      </div>
    </McpFrame>
  );
}

function McpHubPaid({ dark }) {
  return (
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Integrations" backLabel="← Settings">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.45 }}>
          Use your highlights in the agent you already use. OAuth happens in your agent — not in this app.
        </div>
      </div>
      <div style={{ margin: "0 16px 10px", padding: 12, border: "1px solid var(--rule)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
          <div>
            <div className="u-sans" style={{ fontSize: 14, fontWeight: 500 }}>Status</div>
            <div className="u-mono" style={{ fontSize: 10, marginTop: 4 }}>Add an AI app, then approve when the browser opens.</div>
          </div>
          <span className="u-mono" style={{ fontSize: 10, color: "var(--ink)" }}>Ready</span>
        </div>
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink)" }}>Active</div>
      <div className="u-sans" style={{ fontSize: 12, color: "var(--ink)", padding: "8px 16px 12px" }}>
        Nothing connected yet. Add an AI app, then approve when the browser opens.
      </div>
      <div style={{ padding: "8px 16px 12px" }}>
        <button className="u-caps" style={{ width: "100%", minHeight: 44, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--paper)" }}>Add an AI app</button>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--accent)" }}>▸ Server details</div>
      </div>
    </McpFrame>
  );
}

function McpPicker({ dark }) {
  const apps = [
    ["Claude Code", "CLI · one command"],
    ["Claude Desktop", "Paste URL in host settings"],
    ["Codex", "CLI · one command"],
    ["ChatGPT", "Paste URL in host settings"],
    ["Cursor", "IDE · one-click install"],
    ["Grok (xAI)", "Paste URL in host settings"],
    ["Other MCP client", "Paste URL in host settings"],
  ];
  return (
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Add an AI app" backLabel="← Integrations">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>
          Where should agents read your library?
        </div>
      </div>
      {apps.map(([name, sub]) => (
        <Row key={name} title={name} sub={sub} right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink)" }}>Set up ›</span>} />
      ))}
    </McpFrame>
  );
}

function McpSetupCursor({ dark }) {
  return (
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Connect Cursor" backLabel="← Add an AI app">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-caps" style={{ fontSize: 10, marginBottom: 8 }}>What you will do</div>
        {[
          "Open Cursor with _underscore pre-filled.",
          "In Cursor: Install → Connect / Authenticate.",
          "Allow access in the browser.",
          "Return here — status becomes Connected after the agent finishes.",
        ].map((label, i) => (
          <div key={label} style={{ padding: "8px 0", borderBottom: "1px solid var(--rule-soft)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span className="u-mono" style={{ width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--rule)", fontSize: 10, flexShrink: 0 }}>{i + 1}</span>
            <span className="u-sans" style={{ fontSize: 13, lineHeight: 1.4 }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <button className="u-caps" style={{ width: "100%", minHeight: 44, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--paper)" }}>Open in Cursor</button>
        <div className="u-sans" style={{ fontSize: 11, color: "var(--ink)", marginTop: 10, lineHeight: 1.45 }}>
          Opens Cursor with the Cloud MCP URL pre-filled. OAuth happens in Cursor, not in this app.
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--accent)", marginTop: 16 }}>▸ Manual / Advanced</div>
      </div>
    </McpFrame>
  );
}

window.SettingsAiListLocked = (p) => <SettingsAiList {...p} locked />;
window.SettingsAiListPaid = (p) => <SettingsAiList {...p} locked={false} />;
window.McpHubLockedGuest = (p) => <McpHubLocked {...p} tier="guest" />;
window.McpHubLockedFree = (p) => <McpHubLocked {...p} tier="free" />;
window.McpHubPaid = McpHubPaid;
window.McpPicker = McpPicker;
window.McpSetupCursor = McpSetupCursor;
