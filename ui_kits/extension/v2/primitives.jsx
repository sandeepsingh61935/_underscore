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
   Body is markdown source: paragraphs / bold / lists / fences.
   Optional Edit → source textarea + preview (Collections).
   ~4-line clamp + Show more on read surfaces.
   Spec: docs/superpowers/specs/2026-07-14-highlight-markdown-body-design.md
   ───────────────────────────────────────────────────────────── */
function HighlightCard({ quote, domain, section, url, ttlMs, density = "comfortable", onEdit }) {
  const padY = density === "compact" ? 10 : 14;
  return (
    <div style={{ padding: `${padY}px 16px`, borderBottom: "1px solid var(--rule-soft)" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="qmark" style={{ fontSize: 28, lineHeight: 0.8, marginTop: 4 }}>“</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="u-serif" style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
            {quote}
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
              {domain}{section ? ` / ${section}` : ""}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {onEdit && <span className="u-mono" style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Edit</span>}
              {ttlMs != null && <TTLBadge ms={ttlMs} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   TagPill — 20px inline label chip. NOT the round Chip primitive.
   Modes: default (paper-2 fill), readonly (border only, no fill),
   ghost (dashed "+ name", used for suggestion picks while typing).
   ───────────────────────────────────────────────────────────── */
function TagPill({ label, onRemove, readonly, ghost, onPick }) {
  const inner = (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2, height: 20,
      width: "fit-content", maxWidth: "100%",
      padding: onRemove ? "0 2px 0 6px" : "0 6px",
      borderRadius: "var(--radius)",
      border: `1px ${ghost ? "dashed" : "solid"} var(--rule-soft)`,
      background: ghost || readonly ? "transparent" : "var(--paper-2)",
      flexShrink: 0,
    }}>
      <span className="u-mono" style={{ fontSize: 10, color: ghost ? "var(--ink-3)" : "var(--ink-2)", whiteSpace: "nowrap" }}>
        {ghost ? `+ ${label}` : label}
      </span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 16, height: 16, minWidth: 16, minHeight: 16, padding: 0,
            fontSize: 10, border: "none", background: "transparent", color: "var(--ink-3)", cursor: "pointer",
          }}
        >×</button>
      )}
    </span>
  );
  if (ghost && onPick) {
    return (
      <button onClick={onPick} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
        {inner}
      </button>
    );
  }
  return inner;
}

/* ─────────────────────────────────────────────────────────────
   MarginaliaStrip — accordion notes/labels editor under a highlight.
   States: empty (dashed invite) / collapsed / expanded / saving.
   Notes|Tags share one bordered tray (Notes flex, Tags hug; tags wrap
   under when crowded). Done/Saving top-right of tray — no NOTE header.
   Spec: docs/superpowers/specs/2026-07-14-marginalia-inline-notes-tags-design.md
   ───────────────────────────────────────────────────────────── */
function MarginaliaStrip({ state = "empty", note = "", tags = [], draft = "", onToggle, onDraftChange, onAddTag, onRemoveTag, suggestions = [] }) {
  const margin = "0 16px 8px 24px";
  const width = "calc(100% - 40px)";

  const tray = (children, chrome) => (
    <div style={{
      position: "relative", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 8,
      padding: chrome ? "6px 48px 6px 8px" : "6px 8px",
      border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)", background: "var(--paper)", minHeight: 28,
    }}>
      {children}
      {chrome && (
        <div style={{ position: "absolute", top: 6, right: 8 }}>{chrome}</div>
      )}
    </div>
  );

  if (state === "empty") {
    return (
      <button onClick={onToggle} style={{
        display: "block", width, margin, padding: "7px 10px", textAlign: "left",
        border: "1px dashed var(--rule-soft)", background: "transparent", cursor: "pointer",
      }}>
        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>+ Add note or tags</span>
      </button>
    );
  }

  if (state === "collapsed") {
    return (
      <button onClick={onToggle} style={{
        display: "block", width, margin, padding: "8px 10px", textAlign: "left", border: "none",
        borderLeft: "2px solid var(--accent)", background: "var(--paper-2)", cursor: "pointer",
      }}>
        {tray(
          <>
            {note.trim() && (
              <span style={{
                flex: "1 1 120px", minWidth: 0, fontFamily: "var(--sans)", fontSize: 11, lineHeight: 1.4,
                fontStyle: "italic", color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{note}</span>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, flex: "0 1 auto", maxWidth: "100%" }}>
              {tags.map((t) => <TagPill key={t} label={t} readonly />)}
              <span className="u-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-3)" }}>Edit</span>
            </div>
          </>
        )}
      </button>
    );
  }

  // expanded / saving — one shared tray; Done/Saving top-right
  const chrome = state === "saving" ? (
    <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Saving…</span>
  ) : (
    <button onClick={onToggle} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
      <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Done</span>
    </button>
  );

  return (
    <div style={{
      width, margin, padding: "8px 10px 8px 12px",
      borderLeft: "2px solid var(--accent)", background: "var(--paper-2)",
    }}>
      {tray(
        <>
          <textarea
            value={note}
            rows={1}
            placeholder="What stood out?"
            readOnly
            style={{
              flex: "1 1 120px", minWidth: 100, boxSizing: "border-box", resize: "none", overflow: "hidden",
              fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.4, color: "var(--ink)",
              background: "transparent", border: "none", outline: "none", padding: 0, margin: 0,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, flex: "0 1 auto", maxWidth: "100%" }}>
            {tags.map((t) => <TagPill key={t} label={t} onRemove={() => onRemoveTag?.(t)} />)}
            <input
              value={draft}
              onChange={(e) => onDraftChange?.(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); onAddTag?.(); } }}
              placeholder={tags.length === 0 ? "Add tag…" : ""}
              style={{
                flex: "1 1 56px", minWidth: 56, border: "none", outline: "none", background: "transparent",
                fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink)", padding: "2px 0",
              }}
            />
            {suggestions.filter((s) => !tags.includes(s) && (!draft || s.startsWith(draft.toLowerCase()))).map((s) => (
              <TagPill key={s} ghost label={s} onPick={() => onAddTag?.(s)} />
            ))}
          </div>
        </>,
        chrome,
      )}
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
  TagPill, MarginaliaStrip,
  TabBar, Row, Ph,
  SAMPLE_DATA,
});
