// Ask tab — scope bar + thread + composer. Locked until Paid.

const { PopupShell, Btn } = window.V3;

function AskComposer({ placeholder = "Ask…", disabled = false, loading = false }) {
  return (
    <div className="ask-composer">
      <div className="ac-shell">
        <input placeholder={placeholder} defaultValue="" readOnly disabled={disabled || loading} />
        <button
          type="button"
          className={`ac-send ${loading ? "is-loading" : ""}`}
          aria-label={loading ? "Stop" : "Send"}
          disabled={disabled && !loading}
        >
          {loading ? "·" : "↑"}
        </button>
      </div>
    </div>
  );
}

function AskLocked({ modeId = "basic" }) {
  return (
    <PopupShell title="_underscore" modeId={modeId} activeTab="ask">
      <div className="screen-enter ask-layout">
        <div className="ask-lock-page">
          <p className="al-title">Ask needs Account (Paid)</p>
          <p className="al-body">Answers use only highlights in the selected scope.</p>
          <div className="al-actions">
            <Btn variant="accent" size="sm">
              Open Settings
            </Btn>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function AskEmpty({ modeId = "pro_xai" }) {
  return (
    <PopupShell title="_underscore" modeId={modeId} activeTab="ask">
      <div className="screen-enter ask-layout">
        <div className="ask-chrome">
          <div className="ask-scope-bar">
            <button type="button" className="scope-chip active">
              Page
            </button>
            <button type="button" className="scope-chip">
              Domain
            </button>
            <button type="button" className="scope-chip">
              Library
            </button>
          </div>
          <div className="ag-crumb u-mono" style={{ marginTop: 8, fontSize: 11, color: "var(--ink-3)" }}>
            developer.mozilla.org <span className="ag-sep">›</span> /en-US/docs/Web/CSS
          </div>
        </div>
        <div className="ask-scroll">
          <div className="ask-empty ae-center">
            <p className="ae-hello">5 highlights on this page</p>
            <p className="ae-line">Questions search these notes only.</p>
            <div className="ae-cta">
              {["Summarize", "List tags", "What is cascade?"].map((q) => (
                <button key={q} type="button" className="chip refine-chip">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AskComposer placeholder="Ask about this page…" disabled />
        <div className="ask-ground u-mono">Scope: page · 5 highlights</div>
      </div>
    </PopupShell>
  );
}

function AskThread({ modeId = "pro_xai" }) {
  return (
    <PopupShell title="_underscore" modeId={modeId} activeTab="ask">
      <div className="screen-enter ask-layout">
        <div className="ask-chrome">
          <div className="ask-scope-bar">
            <button type="button" className="scope-chip">
              Page
            </button>
            <button type="button" className="scope-chip active">
              Domain
            </button>
            <button type="button" className="scope-chip">
              Library
            </button>
          </div>
          <div className="ag-crumb u-mono" style={{ marginTop: 8, fontSize: 11, color: "var(--ink-3)" }}>
            developer.mozilla.org
          </div>
        </div>
        <div className="ask-scroll ask-thread" style={{ padding: "12px 14px", gap: 16 }}>
          <div className="ask-turn">
            <div className="at-user">Summarise the cascade notes.</div>
          </div>
          <div className="ask-turn">
            <div className="at-assistant">
              Cascade order: origin → importance → layer → specificity → source order. When two rules
              match, higher specificity wins; ties go to the later rule in the sheet.
            </div>
          </div>
          <div className="ask-turn">
            <div className="at-user">Which quote first?</div>
          </div>
          <div className="ask-turn">
            <div className="at-assistant">
              The cascade overview (tagged fundamentals), then the specificity definition.
            </div>
          </div>
        </div>
        <AskComposer placeholder="Follow-up…" />
        <div className="ask-ground u-mono">Scope: domain · 12 highlights</div>
      </div>
    </PopupShell>
  );
}

function AskStreaming({ modeId = "pro_xai" }) {
  return (
    <PopupShell title="_underscore" modeId={modeId} activeTab="ask">
      <div className="screen-enter ask-layout">
        <div className="ask-chrome">
          <div className="ag-crumb u-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            arxiv.org <span className="ag-sep">›</span> /abs/2401.00001
          </div>
        </div>
        <div className="ask-scroll ask-thread" style={{ padding: "12px 14px", gap: 16 }}>
          <div className="ask-turn">
            <div className="at-user">How does this paper handle privacy?</div>
          </div>
          <div className="ask-turn">
            <div className="at-assistant">
              Retrieval stays on-device against a local index; only non-sensitive embeddings leave when
              the user opts in
              <span className="at-dots" aria-hidden="true">
                …
              </span>
            </div>
          </div>
        </div>
        <AskComposer placeholder="Ask…" loading />
        <div className="ask-ground u-mono">Scope: section · 4 highlights</div>
      </div>
    </PopupShell>
  );
}

function AskNoModel({ modeId = "pro_xai" }) {
  return (
    <PopupShell title="_underscore" modeId={modeId} activeTab="ask">
      <div className="screen-enter ask-layout">
        <div className="ask-lock-page">
          <p className="al-title">No model selected</p>
          <p className="al-body">Add a provider key under Settings → Connect to AI.</p>
          <div className="al-actions">
            <Btn variant="accent" size="sm">
              Connect to AI
            </Btn>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

window.V3Ask = {
  AskLocked,
  AskEmpty,
  AskThread,
  AskStreaming,
  AskNoModel,
};
