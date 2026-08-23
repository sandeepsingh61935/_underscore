// Warning / caution dialogs — destructive and high-cost user actions.
// Pattern: prototype .confirm-dialog + production DeleteConfirmDialog copy.

const { PopupShell, DOMAINS, HIGHLIGHTS, Btn, DomainRow, HlCard } = window.V3;

/**
 * severity: 'danger' | 'caution'
 * - danger: irreversible data loss (delete)
 * - caution: account / access change (sign out, disconnect)
 */
function ConfirmDialog({
  title,
  warn,
  note = "This action cannot be undone.",
  cancelLabel = "Cancel",
  confirmLabel = "Delete",
  severity = "danger",
  busy = false,
  exportFooter = false,
  strongNames = [],
}) {
  // Render warn with optional **name** markers replaced by <strong>
  let warnNode = warn;
  if (strongNames.length) {
    const parts = [];
    let rest = warn;
    strongNames.forEach((name, i) => {
      const idx = rest.indexOf(name);
      if (idx === -1) return;
      if (idx > 0) parts.push(rest.slice(0, idx));
      parts.push(
        <strong key={i}>{name}</strong>
      );
      rest = rest.slice(idx + name.length);
    });
    if (rest) parts.push(rest);
    if (parts.length) warnNode = parts;
  }

  return (
    <div className="confirm-overlay" role="presentation">
      <div
        className={`confirm-dialog severity-${severity}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby="cd-warn cd-note"
      >
        <h3 id="cd-title">{title}</h3>
        <p className="cd-warn" id="cd-warn">
          {warnNode}
        </p>
        {note && (
          <p className={`cd-note ${severity === "caution" ? "is-caution" : ""}`} id="cd-note">
            {note}
          </p>
        )}
        {exportFooter && (
          <div className="cd-export">
            <span className="u-mono cd-export-lab">Export first</span>
            <div className="cd-export-acts">
              <button type="button" className="btn ghost sm">
                MD
              </button>
              <button type="button" className="btn ghost sm">
                XLSX
              </button>
            </div>
          </div>
        )}
        <div className="cd-actions">
          <button type="button" className="btn ghost sm" disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn sm ${severity === "danger" ? "danger" : "accent"}`}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Popup shell with a dialog layered on a believable surface */
function DialogOnSurface({ modeId = "pro_xai", placeTitle = "_underscore · library", activeTab = "collections", backLabel, body, dialog }) {
  return (
    <PopupShell title={placeTitle} modeId={modeId} activeTab={activeTab} backLabel={backLabel}>
      <div className="screen-enter" style={{ position: "relative", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", opacity: 0.45, pointerEvents: "none" }}>
          {body}
        </div>
        {dialog}
      </div>
    </PopupShell>
  );
}

function LibraryBackdrop() {
  return (
    <div>
      <div style={{ padding: "10px 16px 0" }}>
        <h2 className="page-title">Library</h2>
        <p className="page-kicker">3 domains · 5 highlights</p>
      </div>
      {DOMAINS.map((d) => (
        <DomainRow key={d.domain} domain={d.domain} count={d.count} showActions />
      ))}
    </div>
  );
}

function DomainBackdrop() {
  const d = DOMAINS[0];
  return (
    <div>
      <div className="scope-head">
        <div className="scope-head-text">
          <h2 className="page-title page-title-domain">{d.domain}</h2>
          <p className="page-kicker">{d.count} highlights</p>
        </div>
      </div>
      <div style={{ padding: "0 16px 8px", display: "flex", gap: 8 }}>
        <Btn variant="ghost" size="sm">Synthesize</Btn>
        <Btn variant="ghost" size="sm" danger>Delete domain</Btn>
      </div>
    </div>
  );
}

function SectionBackdrop() {
  const hs = HIGHLIGHTS.filter((h) => h.domain === "developer.mozilla.org");
  return (
    <div>
      <div className="scope-head">
        <div className="scope-head-text">
          <h2 className="page-title page-title-section">/en-US/docs/Web/CSS</h2>
          <p className="page-kicker">{hs.length} highlights</p>
        </div>
      </div>
      {hs.slice(0, 2).map((h) => (
        <HlCard key={h.id} h={h} showMeta={false} />
      ))}
    </div>
  );
}

function SettingsBackdrop() {
  return (
    <div>
      <div className="settings-head">
        <h2 className="settings-title">Settings</h2>
        <button type="button" className="settings-close" aria-label="Close">×</button>
      </div>
      <div className="row" style={{ cursor: "default" }}>
        <div>
          <div className="title">alex@example.com</div>
          <div className="sub">Account (Paid)</div>
        </div>
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>Library</div>
      <button type="button" className="row">
        <div>
          <div className="title">Delete library</div>
          <div className="sub">Permanently remove all highlights on this device</div>
        </div>
        <span className="trail">▸</span>
      </button>
    </div>
  );
}

/* ── Danger: irreversible deletes ── */

function DialogDeleteDomain() {
  return (
    <DialogOnSurface
      backLabel="Library"
      body={<DomainBackdrop />}
      dialog={
        <ConfirmDialog
          severity="danger"
          title="Delete this domain?"
          warn="This permanently removes 12 highlights from developer.mozilla.org and all of its sections."
          strongNames={["developer.mozilla.org"]}
          note="This action cannot be undone."
          confirmLabel="Delete permanently"
          exportFooter
        />
      }
    />
  );
}

function DialogDeleteSection() {
  return (
    <DialogOnSurface
      backLabel="developer.mozilla.org"
      body={<SectionBackdrop />}
      dialog={
        <ConfirmDialog
          severity="danger"
          title="Delete this section?"
          warn="This permanently removes 5 highlights in /en-US/docs/Web/CSS on developer.mozilla.org."
          strongNames={["/en-US/docs/Web/CSS", "developer.mozilla.org"]}
          note="This action cannot be undone."
          confirmLabel="Delete permanently"
          exportFooter
        />
      }
    />
  );
}

function DialogDeleteHighlight() {
  return (
    <DialogOnSurface
      backLabel="developer.mozilla.org"
      body={<SectionBackdrop />}
      dialog={
        <ConfirmDialog
          severity="danger"
          title="Delete this highlight?"
          warn="The quote, note, and tags will be removed. Nothing else in the section is affected."
          note="This action cannot be undone."
          confirmLabel="Delete"
        />
      }
    />
  );
}

function DialogDeleteLibraryGuest() {
  return (
    <DialogOnSurface
      modeId="basic"
      placeTitle="_underscore · settings"
      activeTab="settings"
      body={<SettingsBackdrop />}
      dialog={
        <ConfirmDialog
          severity="danger"
          title="Delete entire library?"
          warn="This permanently removes all highlights stored on this device as a guest."
          note="This action cannot be undone."
          confirmLabel="Delete permanently"
        />
      }
    />
  );
}

function DialogDeleteLibrarySignedIn() {
  return (
    <DialogOnSurface
      modeId="pro"
      placeTitle="_underscore · settings"
      activeTab="settings"
      body={<SettingsBackdrop />}
      dialog={
        <ConfirmDialog
          severity="danger"
          title="Delete entire library?"
          warn="This permanently removes all highlights from this device and marks them deleted in the cloud."
          note="This action cannot be undone."
          confirmLabel="Delete permanently"
          exportFooter
        />
      }
    />
  );
}

function DialogDeleteBusy() {
  return (
    <DialogOnSurface
      body={<LibraryBackdrop />}
      dialog={
        <ConfirmDialog
          severity="danger"
          title="Delete this domain?"
          warn="This permanently removes 8 highlights from news.ycombinator.com and all of its sections."
          strongNames={["news.ycombinator.com"]}
          confirmLabel="Delete permanently"
          busy
        />
      }
    />
  );
}

/* ── Caution: access / account changes ── */

function DialogSignOut() {
  return (
    <DialogOnSurface
      modeId="pro"
      placeTitle="_underscore · settings"
      activeTab="settings"
      body={<SettingsBackdrop />}
      dialog={
        <ConfirmDialog
          severity="caution"
          title="Sign out?"
          warn="You’ll keep Guest access on this device. Cloud sync and export pause until you sign in again."
          note="Highlights on this device stay."
          cancelLabel="Stay signed in"
          confirmLabel="Sign out"
        />
      }
    />
  );
}

function DialogClearProviderKey() {
  return (
    <DialogOnSurface
      modeId="pro_xai"
      placeTitle="_underscore · settings"
      activeTab="settings"
      backLabel="Connect to AI"
      body={
        <div style={{ padding: "14px 16px" }}>
          <div className="page-kicker u-mono">Provider</div>
          <h2 className="page-title" style={{ fontSize: 22, margin: "2px 0 0" }}>xAI</h2>
          <p className="u-sans" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>API key saved on this device.</p>
        </div>
      }
      dialog={
        <ConfirmDialog
          severity="caution"
          title="Remove API key?"
          warn="xAI will stop working for Ask and summarize until you add a key again. The key is deleted only from this browser."
          strongNames={["xAI"]}
          note="You can paste a new key anytime."
          cancelLabel="Keep key"
          confirmLabel="Remove key"
        />
      }
    />
  );
}

function DialogDiscardEdit() {
  return (
    <DialogOnSurface
      backLabel="developer.mozilla.org"
      body={<SectionBackdrop />}
      dialog={
        <ConfirmDialog
          severity="caution"
          title="Discard edits?"
          warn="Unsaved changes to this highlight will be lost."
          note="The saved version stays as-is."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
        />
      }
    />
  );
}

/** Spec sheet — when to use which tone */
function DialogSeveritySpec() {
  const rows = [
    ["Delete domain / section / library", "Danger", "Data gone; export optional"],
    ["Delete one highlight", "Danger", "Narrow scope; short copy"],
    ["Sign out", "Caution", "Access changes; data stays local"],
    ["Remove API key", "Caution", "Feature stops; key only local"],
    ["Discard unsaved edit", "Caution", "Reversible only by re-edit"],
  ];
  return (
    <div className="ue" style={{ width: 440, padding: 16, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>
        Dialog tones
      </div>
      <p className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", margin: "6px 0 0", lineHeight: 1.4 }}>
        One step. Name the object. State what is lost. Cancel is always safe.
      </p>
      <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr className="u-mono" style={{ textAlign: "left", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            <th style={{ padding: "6px 8px 6px 0", borderBottom: "1px solid var(--rule)" }}>Action</th>
            <th style={{ padding: "6px 8px 6px 0", borderBottom: "1px solid var(--rule)" }}>Tone</th>
            <th style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              <td className="u-sans" style={{ padding: "8px 8px 8px 0", borderBottom: "1px solid var(--rule-soft)", color: "var(--ink)" }}>{r[0]}</td>
              <td className="u-mono" style={{ padding: "8px 8px 8px 0", borderBottom: "1px solid var(--rule-soft)", fontSize: 10, color: r[1] === "Danger" ? "#8a2a1a" : "var(--ink-2)" }}>{r[1]}</td>
              <td className="u-sans" style={{ padding: "8px 0", borderBottom: "1px solid var(--rule-soft)", color: "var(--ink-3)" }}>{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <div style={{ flex: 1, border: "1px solid var(--rule)", padding: 12 }}>
          <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a2a1a" }}>Danger</div>
          <div className="u-sans" style={{ fontSize: 12, marginTop: 6, color: "var(--ink-2)", lineHeight: 1.35 }}>Confirm = ghost Cancel + danger Delete</div>
        </div>
        <div style={{ flex: 1, border: "1px solid var(--rule)", padding: 12 }}>
          <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>Caution</div>
          <div className="u-sans" style={{ fontSize: 12, marginTop: 6, color: "var(--ink-2)", lineHeight: 1.35 }}>Confirm = ghost Cancel + accent action</div>
        </div>
      </div>
    </div>
  );
}

/** Isolated dialog chrome (no dimmed shell) for type scale review */
function DialogChromeDanger() {
  return (
    <div className="ue" style={{ width: 400, height: 320, background: "var(--paper-2)", border: "1px solid var(--rule)", position: "relative" }}>
      <ConfirmDialog
        severity="danger"
        title="Delete this domain?"
        warn="This permanently removes 12 highlights from developer.mozilla.org and all of its sections."
        strongNames={["developer.mozilla.org"]}
        confirmLabel="Delete permanently"
        exportFooter
      />
    </div>
  );
}

function DialogChromeCaution() {
  return (
    <div className="ue" style={{ width: 400, height: 280, background: "var(--paper-2)", border: "1px solid var(--rule)", position: "relative" }}>
      <ConfirmDialog
        severity="caution"
        title="Sign out?"
        warn="You’ll keep Guest access on this device. Cloud sync and export pause until you sign in again."
        note="Highlights on this device stay."
        cancelLabel="Stay signed in"
        confirmLabel="Sign out"
      />
    </div>
  );
}

window.V3Dialogs = {
  ConfirmDialog,
  DialogDeleteDomain,
  DialogDeleteSection,
  DialogDeleteHighlight,
  DialogDeleteLibraryGuest,
  DialogDeleteLibrarySignedIn,
  DialogDeleteBusy,
  DialogSignOut,
  DialogClearProviderKey,
  DialogDiscardEdit,
  DialogSeveritySpec,
  DialogChromeDanger,
  DialogChromeCaution,
};
