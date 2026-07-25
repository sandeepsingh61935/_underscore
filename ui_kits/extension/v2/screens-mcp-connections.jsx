// Connect to AI — Option B artboards (implementation spec)
// Matches settings-ai-simplify + mcp-connections-mockup locked decisions.
// No body serif titles; no Configure footer on hub; chrome title only.

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
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="var(--ink-3)" strokeWidth="1.25" />
      <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" stroke="var(--ink-3)" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" stroke="var(--ink-3)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsAiList({ dark, locked }) {
  return (
    <PopupFrame dark={dark} title="_underscore · settings" mode="cloud">
      <div style={{ padding: "12px 16px 6px" }}>
        <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Settings</div>
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>General</div>
      <Row title="Theme" sub="Match system" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>System</span>} />
      <Row title="Mode" sub={locked ? "Guest" : "Account (Paid)"} right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{locked ? "Local" : "Change"}</span>} />
      <Row title="Density" sub="Comfortable" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Edit</span>} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>AI</div>
      <Row
        title="Connect to AI"
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
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Connect to AI" backLabel="← Settings">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45 }}>
          Use your highlights in the agent you already use
        </div>
      </div>
      <div style={{ margin: "0 16px 10px", padding: 14, border: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
        <div className="u-sans" style={{ fontSize: 14, fontWeight: 500 }}>Included with Account (Paid)</div>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.45 }}>
          You connect your own AI — no token cost from _underscore.
        </div>
        <button className="u-caps" style={{ marginTop: 10, width: "100%", minHeight: 44, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--paper)" }}>
          {isGuest ? "Sign in to continue" : "Upgrade · Coming soon"}
        </button>
      </div>
      <div style={{ margin: "0 16px 10px", padding: 12, border: "1px solid var(--rule)", opacity: 0.65 }}>
        <Row title="Let AI apps read highlights" sub="Locked" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Off</span>} />
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Active</div>
      <div className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", padding: "8px 16px 12px" }}>
        Connections unlock with Account (Paid).
      </div>
      <div style={{ padding: "8px 16px 16px" }}>
        <button className="u-caps" style={{ width: "100%", minHeight: 44, border: "1px solid var(--rule)", background: "var(--paper-2)", color: "var(--ink-3)" }}>Add an AI app</button>
      </div>
    </McpFrame>
  );
}

function McpHubPaid({ dark }) {
  return (
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Connect to AI" backLabel="← Settings">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45 }}>
          Use your highlights in the agent you already use
        </div>
      </div>
      <div style={{ margin: "0 16px 10px", padding: 12, border: "1px solid var(--rule)" }}>
        <Row title="Let AI apps read highlights" sub="On · bridge listening" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--accent)" }}>On</span>} />
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--rule-soft)" }}>
          <div className="u-sans" style={{ fontSize: 13, fontWeight: 500 }}>Security code</div>
          <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>Same value in every client config</div>
        </div>
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Active</div>
      <Row title="Cursor" sub="Agent · ~/.cursor/mcp.json" right={<span className="u-mono" style={{ fontSize: 10, color: "var(--accent)" }}>Connected</span>} />
      <div style={{ padding: "8px 16px 16px" }}>
        <button className="u-caps" style={{ width: "100%", minHeight: 44, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--paper)" }}>Add an AI app</button>
      </div>
    </McpFrame>
  );
}

function McpPicker({ dark }) {
  const apps = [
    ["Claude Code", "CLI / IDE"],
    ["Claude Desktop", "Desktop app"],
    ["Codex", "CLI / IDE"],
    ["ChatGPT Desktop", "Desktop Codex host"],
    ["Cursor", "Agent"],
    ["Antigravity", "Google agent"],
    ["Gemini", "Gemini MCP"],
    ["Other MCP client", "Generic snippet"],
  ];
  return (
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Add an AI app" backLabel="← Connect to AI">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.4 }}>
          Where do you want to use your highlights?
        </div>
      </div>
      {apps.map(([name, sub]) => (
        <Row key={name} title={name} sub={sub} right={<span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Set up ›</span>} />
      ))}
    </McpFrame>
  );
}

function McpSetupCursor({ dark }) {
  return (
    <McpFrame dark={dark} title="_underscore · settings" pageTitle="Connect Cursor" backLabel="← Add an AI app">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45 }}>
          Shared bridge checklist — only the config path and snippet change for Cursor.
        </div>
      </div>
      {["Turn on in _underscore", "Copy security code", "Add server to client config", "Restart / reload client", "Check connection"].map((label, i) => (
        <div key={label} style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)", display: "flex", gap: 10, alignItems: "center" }}>
          <span className="u-mono" style={{ width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--rule)", fontSize: 10, color: "var(--ink-3)" }}>{i + 1}</span>
          <span className="u-sans" style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        </div>
      ))}
      <div style={{ padding: 16 }}>
        <button className="u-caps" style={{ width: "100%", minHeight: 44, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--paper)" }}>Check connection</button>
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
