// Shared primitives for _underscore v2 wireframes.
// Popup frame (400x600 Chrome-ish popup), mode definitions, small UI atoms.

const { useState, useEffect, useMemo, useRef } = React;

/* ─────────────────────────────────────────────────────────────
   Mode registry — four modes, two families.
   Names are chosen to feel editorial + precise, not cute.
   ───────────────────────────────────────────────────────────── */
const MODES = [
  {
    id: "ephemeral",
    family: "local",
    name: "Ephemeral",
    altName: "Non-persistent",
    tag: "24-hour memory",
    blurb: "Highlights live on this device and fade after 24 hours.",
    motif: "◷", // clock-ish glyph placeholder
    accent: "var(--mode-ephemeral)",
    persistence: "auto-expires · 24h",
    signin: false,
    ttl: true,
  },
  {
    id: "local",
    family: "local",
    name: "Local",
    altName: "Persistent local",
    tag: "This device",
    blurb: "Saved to this browser indefinitely. You delete them.",
    motif: "▣",
    accent: "var(--mode-local)",
    persistence: "kept until deleted",
    signin: false,
    ttl: false,
  },
  {
    id: "cloud",
    family: "cloud",
    name: "Cloud",
    altName: "Persistent cloud",
    tag: "Synced",
    blurb: "Signed in. Synced across every device you use.",
    motif: "◇",
    accent: "var(--mode-cloud)",
    persistence: "synced · always",
    signin: true,
    ttl: false,
  },
  {
    id: "ai",
    family: "cloud",
    name: "AI",
    altName: "AI-enabled",
    tag: "Readable by models",
    blurb: "Cloud-synced and readable by LLMs you connect via MCP.",
    motif: "✦",
    accent: "var(--mode-ai)",
    persistence: "synced · readable by AI",
    signin: true,
    ttl: false,
  },
];
const modeById = (id) => MODES.find((m) => m.id === id) || MODES[1];

/* ─────────────────────────────────────────────────────────────
   Popup frame — 400×600 with an optional chrome "browser popup"
   look (titlebar + arrow triangle), scaled to fit artboards.
   ───────────────────────────────────────────────────────────── */
function PopupFrame({ dark = false, children, mode, title = "_underscore", chromeStyle = "simple" }) {
  return (
    <div className={`ue ${dark ? "dark" : ""}`} style={{ width: 400 }}>
      {chromeStyle !== "none" && <PopupChrome dark={dark} title={title} mode={mode} />}
      <div className="popup" style={{ borderTop: chromeStyle !== "none" ? "none" : "1px solid var(--rule)" }}>
        {children}
      </div>
    </div>
  );
}

function PopupChrome({ dark, title, mode }) {
  const m = mode ? modeById(mode) : null;
  return (
    <div style={{
      width: 400,
      background: "var(--paper-2)",
      borderLeft: "1px solid var(--rule)",
      borderRight: "1px solid var(--rule)",
      borderTop: "1px solid var(--rule)",
      padding: "8px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: "var(--mono)",
      fontSize: 10,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--ink-3)",
    }}>
      <span>{title}</span>
      {m && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: m.accent, display: "inline-block" }} />
          {m.name}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Status bar — the strip at the top of most popup screens.
   Shows active mode as a persistent, unmissable header.
   ───────────────────────────────────────────────────────────── */
function ModeHeader({ modeId = "local", compact = false, onSwitch, backLabel, onBack }) {
  const m = modeById(modeId);
  return (
    <div style={{
      padding: compact ? "10px 16px" : "14px 16px",
      borderBottom: "1px solid var(--rule)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "var(--paper)",
    }}>
      {onBack ? (
        <button onClick={onBack} className="u-mono" style={{
          all: "unset", cursor: "pointer",
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)",
        }}>← {backLabel || "Back"}</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: m.accent }} />
          <span className="u-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-2)" }}>
            {m.name} · {m.family === "local" ? "on this device" : "cloud"}
          </span>
        </div>
      )}
      {onSwitch && (
        <button onClick={onSwitch} className="u-mono" style={{
          all: "unset", cursor: "pointer",
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)",
        }}>Switch ›</button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Quote / highlight card — used throughout. A proper pull-quote.
   ───────────────────────────────────────────────────────────── */
function HighlightCard({ quote, domain, section, url, ttlMs, density = "comfortable" }) {
  const padY = density === "compact" ? 10 : 14;
  return (
    <div style={{ padding: `${padY}px 16px`, borderBottom: "1px solid var(--rule-soft)" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="qmark" style={{ fontSize: 28, lineHeight: 0.8, marginTop: 4 }}>“</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="u-serif" style={{ fontSize: 14, lineHeight: 1.4, color: "var(--ink)" }}>
            {quote}
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
              {domain}{section ? ` / ${section}` : ""}
            </div>
            {ttlMs != null && <TTLBadge ms={ttlMs} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TTL — precise. Countdown clock + segmented bar (fraction left).
   The brief specified "Precise".
   ───────────────────────────────────────────────────────────── */
function TTLBadge({ ms, total = 24 * 3600 * 1000 }) {
  const pct = Math.max(0, Math.min(1, ms / total));
  const h = Math.floor(ms / 3600_000);
  const mn = Math.floor((ms % 3600_000) / 60_000);
  const label = h >= 1 ? `${h}h ${mn}m` : `${mn}m`;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={`${label} remaining`}>
      <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>{label}</span>
      <span style={{ position: "relative", width: 40, height: 4, background: "var(--rule-soft)" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, background: "var(--accent)" }} />
      </span>
    </span>
  );
}

/* A bigger TTL meter used on the detail card */
function TTLMeter({ ms, total = 24 * 3600 * 1000 }) {
  const pct = Math.max(0, Math.min(1, ms / total));
  const h = Math.floor(ms / 3600_000);
  const mn = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <div style={{ padding: "10px 16px", borderTop: "1px solid var(--rule-soft)", borderBottom: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span className="u-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Expires in
        </span>
        <span className="u-mono" style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
          {String(h).padStart(2, "0")}:{String(mn).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 2, height: 6 }}>
        {Array.from({ length: 24 }).map((_, i) => {
          const filled = i / 24 < pct;
          return <span key={i} style={{ background: filled ? "var(--accent)" : "var(--rule-soft)" }} />;
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tab bar — bottom nav for popup
   ───────────────────────────────────────────────────────────── */
function TabBar({ active = "home", onChange = () => {} }) {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "collections", label: "Library" },
    { id: "capture", label: "Capture" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={active === t.id ? "active" : ""} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* Row primitive for lists */
function Row({ left, title, meta, right, onClick, compact = false, sub }) {
  return (
    <button onClick={onClick} style={{
      all: "unset",
      cursor: onClick ? "pointer" : "default",
      display: "grid",
      gridTemplateColumns: left ? "auto 1fr auto" : "1fr auto",
      alignItems: "center",
      gap: 12,
      padding: compact ? "10px 16px" : "14px 16px",
      borderBottom: "1px solid var(--rule-soft)",
      minHeight: 44,
    }}>
      {left}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        {sub && <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </button>
  );
}

/* Placeholder block */
function Ph({ w = "100%", h = 60, label, style = {} }) {
  return (
    <div className="ph" style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      {label && <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em" }}>{label}</span>}
    </div>
  );
}

/* Sample data so screens don't feel empty */
const SAMPLE_DATA = [
  {
    domain: "anthropic.com",
    count: 14,
    sections: [
      { name: "Academy", count: 6, items: [
        { q: "A good prompt is one you could hand to a thoughtful colleague.", url: "/academy/prompting", ttl: 18 * 3600_000 },
        { q: "Evaluation is not a phase. It is the practice.", url: "/academy/evals", ttl: 9 * 3600_000 },
        { q: "Constitutional methods aim for principles, not rules.", url: "/academy/constitutional", ttl: 3.5 * 3600_000 },
      ]},
      { name: "Research Papers", count: 5, items: [] },
      { name: "Guidelines", count: 3, items: [] },
    ],
  },
  {
    domain: "nytimes.com",
    count: 23,
    sections: [
      { name: "Opinion", count: 9, items: [] },
      { name: "The Interpreter", count: 7, items: [] },
      { name: "Magazine", count: 7, items: [] },
    ],
  },
  {
    domain: "theguardian.com",
    count: 8,
    sections: [
      { name: "Long read", count: 5, items: [] },
      { name: "Books", count: 3, items: [] },
    ],
  },
  {
    domain: "stratechery.com",
    count: 6,
    sections: [
      { name: "Weekly Article", count: 4, items: [] },
      { name: "Updates", count: 2, items: [] },
    ],
  },
];

Object.assign(window, {
  MODES, modeById,
  PopupFrame, PopupChrome,
  ModeHeader, HighlightCard, TTLBadge, TTLMeter,
  TabBar, Row, Ph,
  SAMPLE_DATA,
});
