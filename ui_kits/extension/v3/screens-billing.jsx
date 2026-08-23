// Account / Billing UX — Polar (billing-ui-plan.md)
// Free vs Account (Paid) · Upgrade → Polar · Manage → Portal · Sync · gates

const { PopupShell, Btn, Switch } = window.V3;

function BiSettingsHead() {
  return (
    <div className="settings-head">
      <h2 className="settings-title">Settings</h2>
      <button type="button" className="settings-close" aria-label="Close">
        ×
      </button>
    </div>
  );
}

/** Status pill — never a button */
function PlanPill({ kind = "free" }) {
  // free | paid | past_due | loading
  if (kind === "loading") {
    return (
      <span className="ui-status plain" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span className="state-dot-spin" aria-hidden="true" />
        …
      </span>
    );
  }
  if (kind === "past_due") {
    return (
      <span className="plan-pill warn" style={{ color: "var(--ink-2)", letterSpacing: "0.06em" }}>
        Past due
      </span>
    );
  }
  if (kind === "paid") {
    return <span className="plan-pill paid">Paid</span>;
  }
  return <span className="plan-pill">Free</span>;
}

function AccountRow({ email, sub, pill, signOut = true }) {
  return (
    <div className="row" style={{ cursor: "default" }} data-od-id="account-row">
      <div style={{ minWidth: 0 }}>
        <div className="title" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {email}
        </div>
        <div className="sub">{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {pill}
        {signOut && (
          <button type="button" className="btn-text act">
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

function BillingCtaRow({ title, sub, trail, busy = false, accent = false }) {
  return (
    <button type="button" className="row" data-od-id="billing-cta">
      <div style={{ minWidth: 0 }}>
        <div className="title">{title}</div>
        <div className="sub">{sub}</div>
      </div>
      {busy ? (
        <span className="ui-status plain">
          <span className="state-dot-spin" aria-hidden="true" />
        </span>
      ) : (
        <span className={`trail ${accent ? "accent" : ""}`} style={accent ? { color: "var(--accent)" } : undefined}>
          {trail}
        </span>
      )}
    </button>
  );
}

function SyncRow({ sub = "Already paid? Pull status from Polar and update this account." }) {
  return (
    <button type="button" className="row" data-od-id="billing-sync">
      <div>
        <div className="title">Refresh subscription status</div>
        <div className="sub">{sub}</div>
      </div>
      <span className="trail" style={{ color: "var(--ink-2)" }}>
        Sync
      </span>
    </button>
  );
}

function BillingBanner({ kind }) {
  const map = {
    success_pending: {
      title: "Payment successful",
      body: "Activating Account (Paid)… stay on this screen, then Sync if the pill lags.",
      extra: (
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="state-dot-spin" aria-hidden="true" />
          Confirming subscription…
        </div>
      ),
    },
    success_active: {
      title: "Payment successful",
      body: "Paid is active. Ask and providers are available.",
      extra: (
        <span className="plan-pill paid" style={{ display: "inline-block", marginTop: 8 }}>
          Account (Paid)
        </span>
      ),
    },
    cancel: {
      title: "Checkout canceled",
      body: "No charge. Upgrade anytime below.",
    },
    cancel_scheduled: {
      title: "Cancel scheduled",
      body: "You’ll keep Paid features until 4 Sep 2026. After that, account returns to Free. Library stays.",
    },
    web_handoff: {
      title: "Finish on the web",
      body: "Complete Polar checkout in the browser tab, then Sync here.",
    },
  };
  const b = map[kind];
  if (!b) return null;
  return (
    <div
      className="banner state-banner"
      role="status"
      style={{
        margin: "4px 16px 10px",
        padding: 14,
        background: "var(--paper-2)",
        border: "1px solid var(--rule-soft)",
      }}
    >
      <div className="u-serif" style={{ fontSize: 16, letterSpacing: "-0.015em", fontWeight: 500 }}>
        {b.title}
      </div>
      <div className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.4 }}>
        {b.body}
      </div>
      {b.extra}
    </div>
  );
}

function ModeInspection() {
  return (
    <div style={{ padding: "8px 16px 12px" }}>
      <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>
        Design inspection · not billing
      </div>
      <div className="seg" role="radiogroup" aria-label="Design mode">
        <button type="button">Guest</button>
        <button type="button" className="active">
          Starter
        </button>
        <button type="button">Pro</button>
      </div>
    </div>
  );
}

function SettingsShell({ modeId = "pro", children }) {
  return (
    <PopupShell title="_underscore · settings" modeId={modeId} activeTab="settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <BiSettingsHead />
        <div className="list-scroll" style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </PopupShell>
  );
}

/** Guest — no billing rows */
function BillingGuest() {
  return (
    <SettingsShell modeId="basic">
      <div className="local-status-card">
        <div className="ls-kicker">Local only</div>
        <div className="ls-title">Highlights stay on this device</div>
        <div className="ls-body">Sign in for sync and export. Paid adds Ask.</div>
        <div className="ls-actions">
          <Btn variant="accent" size="sm">
            Sign in
          </Btn>
        </div>
      </div>
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <div className="row" style={{ cursor: "default" }}>
        <div>
          <div className="title">Not signed in</div>
          <div className="sub">Sync library · export · AI</div>
        </div>
        <button type="button" className="btn-text act">
          Sign in
        </button>
      </div>
      <ModeInspection />
    </SettingsShell>
  );
}

/** Free account — Upgrade + Sync */
function BillingFree() {
  return (
    <SettingsShell modeId="pro">
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow email="alex@example.com" sub="Free · Sync & export" pill={<PlanPill kind="free" />} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Billing
      </div>
      <BillingCtaRow
        title="Upgrade to Account (Paid)"
        sub="Ask, summarize, providers — Polar"
        trail="Upgrade"
        accent
      />
      <SyncRow />
      <ModeInspection />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        AI
      </div>
      <button type="button" className="row">
        <div>
          <div className="title">Connect to AI</div>
          <div className="sub">Locked on Free</div>
        </div>
        <span className="trail" style={{ color: "var(--accent)" }}>
          Upgrade
        </span>
      </button>
    </SettingsShell>
  );
}

/** Paid active — Manage → Portal */
function BillingPaid() {
  return (
    <SettingsShell modeId="pro_xai">
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow email="alex@example.com" sub="Account (Paid) · renews 4 Sep 2026" pill={<PlanPill kind="paid" />} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Billing
      </div>
      <BillingCtaRow title="Manage billing" sub="Invoices, payment method, cancel" trail="Portal" accent />
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
    </SettingsShell>
  );
}

/** Cancel at period end — still Paid until date */
function BillingCancelScheduled() {
  return (
    <SettingsShell modeId="pro_xai">
      <BillingBanner kind="cancel_scheduled" />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow
        email="alex@example.com"
        sub="Cancels 4 Sep 2026 · still Paid"
        pill={<PlanPill kind="paid" />}
      />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Billing
      </div>
      <BillingCtaRow
        title="Manage billing"
        sub="Cancels at period end · invoices & payment"
        trail="Portal"
        accent
      />
    </SettingsShell>
  );
}

/** Past due — AI locked, plan still paid for billing UI */
function BillingPastDue() {
  return (
    <SettingsShell modeId="pro">
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow
        email="alex@example.com"
        sub="Payment past due · AI locked"
        pill={<PlanPill kind="past_due" />}
      />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Billing
      </div>
      <BillingCtaRow title="Update payment" sub="Fix billing in Polar to restore AI" trail="Portal" accent />
      <SyncRow sub="Paid already? Pull status after updating payment." />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        AI
      </div>
      <button type="button" className="row">
        <div>
          <div className="title">Ask</div>
          <div className="sub">Locked until payment is fixed</div>
        </div>
        <span className="trail" style={{ color: "var(--accent)" }}>
          Upgrade
        </span>
      </button>
    </SettingsShell>
  );
}

function BillingLoading() {
  return (
    <SettingsShell modeId="pro_xai">
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow email="alex@example.com" sub="Loading plan…" pill={<PlanPill kind="loading" />} signOut={false} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Billing
      </div>
      <BillingCtaRow title="Manage billing" sub="—" trail="Portal" busy />
    </SettingsShell>
  );
}

function BillingError() {
  return (
    <SettingsShell modeId="pro">
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow
        email="alex@example.com"
        sub="Couldn’t load plan"
        pill={<PlanPill kind="free" />}
      />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Billing
      </div>
      <BillingCtaRow title="Upgrade to Account (Paid)" sub="Billing unavailable · try again" trail="Retry" />
      <SyncRow sub="Sync failed. Keep last known entitlement — no demote." />
    </SettingsShell>
  );
}

/** Optional Free vs Paid compare stack before Polar */
function BillingUpgradeCompare() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro" activeTab="settings" backLabel="Settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "14px 16px 8px" }}>
          <div className="page-kicker u-mono">Billing</div>
          <h2 className="page-title u-serif" style={{ margin: "2px 0 0", fontSize: 22 }}>
            Account (Paid)
          </h2>
          <p className="u-sans" style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.4 }}>
            Checkout is Polar only — no card fields in the popup.
          </p>
        </div>
        <div className="list-scroll" style={{ flex: 1, overflow: "auto", padding: "4px 0 20px" }}>
          <div className="u-mono" style={{ padding: "10px 16px 4px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Free
          </div>
          <div className="row" style={{ cursor: "default" }}><div className="title">Sync</div></div>
          <div className="row" style={{ cursor: "default" }}><div className="title">Export</div></div>
          <div className="row" style={{ cursor: "default" }}><div className="title">Library</div></div>
          <div className="u-mono" style={{ padding: "14px 16px 4px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Account (Paid)
          </div>
          <div className="row" style={{ cursor: "default" }}><div className="title">Everything in Free</div></div>
          <div className="row" style={{ cursor: "default" }}><div className="title">Ask · summarize</div></div>
          <div className="row" style={{ cursor: "default" }}><div className="title">Provider keys · MCP</div></div>
          <div style={{ padding: "16px" }}>
            <button type="button" className="btn accent" style={{ width: "100%" }}>
              Continue to Polar
            </button>
            <p className="u-mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 10, textAlign: "center" }}>
              Cancel in the Polar portal
            </p>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function BillingReturnSuccess() {
  return (
    <SettingsShell modeId="pro_xai">
      <BillingBanner kind="success_active" />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow email="alex@example.com" sub="Account (Paid)" pill={<PlanPill kind="paid" />} />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Billing
      </div>
      <BillingCtaRow title="Manage billing" sub="Invoices, payment method, cancel" trail="Portal" accent />
    </SettingsShell>
  );
}

function BillingReturnPending() {
  return (
    <SettingsShell modeId="pro">
      <BillingBanner kind="success_pending" />
      <BillingBanner kind="web_handoff" />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow email="alex@example.com" sub="Free · confirming…" pill={<PlanPill kind="free" />} />
      <SyncRow sub="Pull status from Polar after checkout." />
    </SettingsShell>
  );
}

function BillingReturnCancel() {
  return (
    <SettingsShell modeId="pro">
      <BillingBanner kind="cancel" />
      <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
        Account
      </div>
      <AccountRow email="alex@example.com" sub="Free · Sync & export" pill={<PlanPill kind="free" />} />
      <BillingCtaRow
        title="Upgrade to Account (Paid)"
        sub="Ask, summarize, providers — Polar"
        trail="Upgrade"
        accent
      />
    </SettingsShell>
  );
}

/** Ask tab lock — Free/past_due use Upgrade (not generic Pro copy) */
function AskLockedBilling({ pastDue = false }) {
  return (
    <PopupShell title="_underscore" modeId="pro" activeTab="ask">
      <div className="screen-enter ask-layout">
        <div className="ask-lock-page">
          <p className="al-title">{pastDue ? "Payment past due" : "Ask needs Account (Paid)"}</p>
          <p className="al-body">
            {pastDue
              ? "Update payment in Polar to restore Ask."
              : "Upgrade opens Polar checkout in a new tab."}
          </p>
          <div className="al-actions">
            <Btn variant="accent" size="sm">
              {pastDue ? "Update payment" : "Upgrade"}
            </Btn>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

/** Matrix specimen for design review */
function BillingStateMatrix() {
  const rows = [
    ["Guest", "—", "—", "Sign in", "—"],
    ["Free", "Free", "Upgrade + Sync", "Upgrade", "—"],
    ["Paid active", "Paid", "Manage · Portal", "Open", "—"],
    ["Cancel @ end", "Paid", "Portal + date", "Open", "Quiet until-date"],
    ["Past due", "Past due", "Portal · fix", "Locked", "Optional warn"],
    ["Loading", "last/…", "spinner", "last", "—"],
    ["Error", "last", "Retry", "last", "—"],
  ];
  return (
    <div className="ue" style={{ width: 520, padding: 16, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>
        Billing states
      </div>
      <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr className="u-mono" style={{ textAlign: "left", color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {["State", "Pill", "Billing row", "AI", "Banner"].map((h) => (
              <th key={h} style={{ padding: "6px 6px 6px 0", borderBottom: "1px solid var(--rule)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="u-sans" style={{ color: "var(--ink-2)" }}>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td
                  key={i}
                  style={{
                    padding: "8px 6px 8px 0",
                    borderBottom: "1px solid var(--rule-soft)",
                    fontWeight: i === 0 ? 500 : 400,
                    color: i === 0 ? "var(--ink)" : undefined,
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12, lineHeight: 1.4 }}>
        Upgrade and Manage open Polar. Do not demote plan on load or error.
      </p>
    </div>
  );
}

window.V3Billing = {
  BillingGuest,
  BillingFree,
  BillingPaid,
  BillingCancelScheduled,
  BillingPastDue,
  BillingLoading,
  BillingError,
  BillingUpgradeCompare,
  BillingReturnSuccess,
  BillingReturnPending,
  BillingReturnCancel,
  AskLockedBilling,
  BillingStateMatrix,
  PlanPill,
};
