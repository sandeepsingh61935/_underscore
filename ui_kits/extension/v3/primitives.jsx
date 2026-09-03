// Shared primitives for _underscore v3 wireframes.
// Source: Web-Prototype extension (Guest · Starter · Pro, 4-tab IA).

const { useState, useEffect, useMemo, useRef } = React;

/* ─────────────────────────────────────────────────────────────
   Mode registry — industry tier names (replaces v2 4-mode model)
   ───────────────────────────────────────────────────────────── */
const MODES = {
  basic: {
    id: "basic",
    name: "Guest",
    family: "device",
    motif: "◷",
    signin: false,
    caps: { sync: false, export: false, ai: false, mcp: false },
  },
  pro: {
    id: "pro",
    name: "Starter",
    family: "cloud",
    motif: "◇",
    signin: true,
    caps: { sync: true, export: true, ai: false, mcp: false },
  },
  pro_xai: {
    id: "pro_xai",
    name: "Pro",
    family: "cloud",
    motif: "+",
    signin: true,
    caps: { sync: true, export: true, ai: true, mcp: true },
  },
};

const modeById = (id) => MODES[id] || MODES.basic;

/* ─────────────────────────────────────────────────────────────
   Sample data (from prototype)
   ───────────────────────────────────────────────────────────── */
const DOMAINS = [
  {
    domain: "developer.mozilla.org",
    count: 12,
    sections: [
      { path: "/en-US/docs/Web/CSS", count: 5 },
      { path: "/en-US/docs/Web/API", count: 7 },
    ],
  },
  {
    domain: "news.ycombinator.com",
    count: 8,
    sections: [{ path: "/item", count: 8 }],
  },
  {
    domain: "arxiv.org",
    count: 4,
    sections: [{ path: "/abs/2401.00001", count: 4 }],
  },
];

const HIGHLIGHTS = [
  {
    id: "h1",
    quote:
      "Cascading is the algorithm for resolving conflicts when multiple CSS rules apply to an element.",
    domain: "developer.mozilla.org",
    path: "/en-US/docs/Web/CSS",
    notes: "Core cascade mental model",
    tags: ["css", "fundamentals", "cascade"],
  },
  {
    id: "h2",
    quote: "Specificity is a weight that is applied to a given CSS declaration.",
    domain: "developer.mozilla.org",
    path: "/en-US/docs/Web/CSS",
    notes: "",
    tags: ["css", "specificity"],
  },
  {
    id: "h3",
    quote:
      "Ship the smallest thing that proves the risk. Everything else is inventory.",
    domain: "news.ycombinator.com",
    path: "/item",
    notes: "Risk before polish",
    tags: ["shipping", "risk"],
  },
  {
    id: "h4",
    quote:
      "We propose a retrieval-augmented approach that keeps user notes private on device.",
    domain: "arxiv.org",
    path: "/abs/2401.00001",
    notes: "Privacy-preserving RAG",
    tags: ["ml", "privacy", "rag"],
  },
  {
    id: "h5",
    quote: "Fetch is the modern replacement for XMLHttpRequest.",
    domain: "developer.mozilla.org",
    path: "/en-US/docs/Web/API",
    notes: "",
    tags: [],
  },
];

const totalHighlights = () => HIGHLIGHTS.length;
const totalDomains = () => DOMAINS.length;

/* ─────────────────────────────────────────────────────────────
   Chrome — three-column title strip
   Left: current activity/page · Center: brand · Right: account
   ───────────────────────────────────────────────────────────── */
/** Derive place label from legacy title strings like "_underscore · library". */
function placeFromTitle(title) {
  if (!title || title === "_underscore") return "";
  const parts = String(title).split("·").map((s) => s.trim());
  if (parts.length >= 2 && parts[0] === "_underscore") {
    return parts.slice(1).join(" · ");
  }
  if (parts[0] === "_underscore") return "";
  return title;
}

const TAB_PLACE = {
  home: "Home",
  collections: "Library",
  ask: "Ask",
  settings: "Settings",
};

function TitleStrip({
  brand = "_underscore",
  place = "",
  title, // legacy: "_underscore · library" → place only
  activeTab,
  modeId = "basic",
  showModePill = true,
}) {
  const m = modeById(modeId);
  const activity = place || placeFromTitle(title) || TAB_PLACE[activeTab] || "";
  return (
    <div className="popup-chrome" data-chrome="title-strip">
      <div className="chrome-side chrome-place" title={activity || undefined}>
        {activity ? <span className="chrome-place-label">{activity}</span> : <span className="chrome-place-spacer" aria-hidden="true" />}
      </div>
      <div className="chrome-brand" aria-label="Brand">
        <span className="chrome-brand-label">{brand}</span>
      </div>
      <div className="chrome-side chrome-account">
        {showModePill ? (
          <button type="button" className="mode-pill" title="Account status — open Settings to change plan" aria-label={`Account: ${m.name}. Open Settings to change.`}>
            <span className="mode-dot" aria-hidden="true" />
            <span>{m.name}</span>
          </button>
        ) : (
          <span className="chrome-place-spacer" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

function ModeHeaderBar({ backLabel, onBack }) {
  if (!backLabel) return null;
  return (
    <div className="mode-header">
      <button type="button" className="nav-back" onClick={onBack}>
        ← {backLabel}
      </button>
    </div>
  );
}

function TabBar({ active = "home" }) {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "collections", label: "Library" },
    { id: "ask", label: "Ask" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <nav className="tabbar" aria-label="Primary">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={active === t.id ? "active" : ""}
          aria-current={active === t.id ? "page" : undefined}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

/**
 * Full popup shell — 400×600 product frame.
 * place: current activity/page (left) — e.g. "Library", "Settings", "Sign in"
 * brand: centered product name (default "_underscore")
 * title: legacy alias for place derivation ("_underscore · library")
 * modeId: basic | pro | pro_xai → account pill (right)
 */
function PopupShell({
  place,
  brand = "_underscore",
  title = "_underscore",
  modeId = "basic",
  showModePill = true,
  showTabs = true,
  activeTab = "home",
  backLabel = null,
  dark = false,
  children,
}) {
  return (
    <div className={`ue ${dark ? "dark" : ""}`} data-theme={dark ? "dark" : "light"}>
      <div className="popup-wrap">
        <TitleStrip
          brand={brand}
          place={place}
          title={title}
          activeTab={showTabs ? activeTab : undefined}
          modeId={modeId}
          showModePill={showModePill}
        />
        <div className="popup">
          <ModeHeaderBar backLabel={backLabel} />
          <div className="body-slot">{children}</div>
          {showTabs && <TabBar active={activeTab} />}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Control atoms — one language for all surfaces
   ───────────────────────────────────────────────────────────── */
const REFINE_OPTS = [
  { id: "has_notes", label: "Has notes" },
  { id: "needs_note", label: "Needs note" },
  { id: "has_tags", label: "Has tags" },
  { id: "untagged", label: "Untagged" },
];

const TAG_CORPUS = [
  { label: "css", n: 4 },
  { label: "cascade", n: 2 },
  { label: "fundamentals", n: 2 },
  { label: "shipping", n: 1 },
  { label: "risk", n: 1 },
  { label: "privacy", n: 1 },
  { label: "rag", n: 1 },
  { label: "ml", n: 1 },
];

function Seg({ options, value }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={value === o ? "active" : ""}
          role="radio"
          aria-checked={value === o}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Switch({ on = false }) {
  return (
    <button
      type="button"
      className={`switch ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
    />
  );
}

function Row({ title, sub, trail, children, asButton = false }) {
  const inner = (
    <>
      <div>
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {trail != null && <span className="trail">{trail}</span>}
      {children}
    </>
  );
  if (asButton) {
    return (
      <button type="button" className="row">
        {inner}
      </button>
    );
  }
  return <div className="row">{inner}</div>;
}

/** Bordered control: primary | accent | ghost | danger (+ sm) */
function Btn({ children, variant = "ghost", size = "sm", className = "", danger = false, ...rest }) {
  const cls = ["btn", variant, size, danger ? "danger" : "", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

/** Quiet mono text action — Edit / Copy / Delete / Sync / Sign out */
function BtnText({ children, danger = false, muted = false, className = "", ...rest }) {
  const cls = [
    "btn-text",
    "act",
    danger ? "is-danger" : "",
    muted ? "is-muted" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state">
      <p className="es-title">{title}</p>
      {body && <p className="es-body">{body}</p>}
      {action && <div className="es-actions">{action}</div>}
    </div>
  );
}

/* Icons for scope row (chat / delete) */
function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6l-2.5 2v-2h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
function IconDelete() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ScopeRowActions({ kind = "domain" }) {
  const ask = kind === "section" ? "Ask about this section" : "Ask about this domain";
  const del = kind === "section" ? "Delete section" : "Delete domain";
  return (
    <div className="sr-actions">
      <button type="button" className="sr-icon" title={ask} aria-label={ask}>
        <IconChat />
      </button>
      <button type="button" className="sr-icon is-delete" title={del} aria-label={del}>
        <IconDelete />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Search + filters (library / domain / section)
   ───────────────────────────────────────────────────────────── */
function SearchBar({
  placeholder = "Search highlights…",
  query = "",
  filterOpen = false,
  filterCount = 0,
  resultCount,
  fields = ["text", "notes", "tags"],
  refine = [],
  tagFilters = [],
  tagBrowse = false,
  showTagPicker = true,
}) {
  const hasFilters = filterCount > 0 || tagFilters.length > 0 || refine.length > 0;
  const activeN =
    filterCount ||
    refine.length +
      tagFilters.length +
      (fields.length && fields.length < 3 ? 1 : 0);

  return (
    <div className="search-bar">
      <div className="search-input-row">
        <span className="glyph" aria-hidden="true">
          ⌕
        </span>
        <input type="text" placeholder={placeholder} defaultValue={query} readOnly aria-label="Search highlights" />
        {query ? (
          <button type="button" className="clear" aria-label="Clear search">
            ×
          </button>
        ) : null}
        <button
          type="button"
          className={`search-filter-btn ${filterOpen ? "open" : ""} ${hasFilters || activeN ? "has-filters" : ""}`}
          aria-label="Filters"
          aria-expanded={filterOpen}
        >
          Filters
          {activeN > 0 ? <span className="fcount">{activeN}</span> : null}
        </button>
      </div>

      {activeN > 0 && (
        <div className="filter-active" role="list" aria-label="Active filters">
          {fields.length < 3 && fields.length > 0 && (
            <span className="filter-active-chip" role="listitem">
              <span>In: {fields.map((f) => f[0].toUpperCase() + f.slice(1)).join(" · ")}</span>
              <button type="button" className="x" aria-label="Clear fields">
                ×
              </button>
            </span>
          )}
          {refine.map((id) => {
            const opt = REFINE_OPTS.find((o) => o.id === id);
            return (
              <span key={id} className="filter-active-chip" role="listitem">
                <span>{opt ? opt.label : id}</span>
                <button type="button" className="x" aria-label={`Remove ${id}`}>
                  ×
                </button>
              </span>
            );
          })}
          {tagFilters.slice(0, 3).map((t) => (
            <span key={t} className="filter-active-chip" role="listitem">
              <span>#{t}</span>
              <button type="button" className="x" aria-label={`Remove tag ${t}`}>
                ×
              </button>
            </span>
          ))}
          {tagFilters.length > 3 && (
            <span className="filter-active-chip" role="listitem">
              <span>+{tagFilters.length - 3} tags</span>
            </span>
          )}
        </div>
      )}

      {resultCount !== undefined && (
        <div className="search-meta-row">
          <span className="search-count">
            {resultCount === 0 ? "No results" : resultCount === 1 ? "1 result" : `${resultCount} results`}
          </span>
          {activeN > 0 && (
            <button type="button" className="search-clear-filters">
              Clear filters
            </button>
          )}
        </div>
      )}

      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-sec">
            <div className="filter-sec-label">Search in</div>
            <div className="filter-chip-row" role="group" aria-label="Search fields">
              {["text", "notes", "tags"].map((id) => {
                const on = fields.includes(id);
                return (
                  <button key={id} type="button" className={`field-chip ${on ? "active" : ""}`} aria-pressed={on}>
                    {on ? <span className="check" aria-hidden="true">✓</span> : null}
                    {id[0].toUpperCase() + id.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="filter-sec">
            <div className="filter-sec-label">Refine</div>
            <div className="filter-chip-row" role="group" aria-label="Refine results">
              {REFINE_OPTS.map((o) => {
                const on = refine.includes(o.id);
                return (
                  <button key={o.id} type="button" className={`refine-chip ${on ? "active" : ""}`} aria-pressed={on}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          {showTagPicker && (
            <div className="tag-picker">
              <div className="tag-picker-head">
                <div className="filter-sec-label">Tags</div>
                <span className="tag-picker-count">{TAG_CORPUS.length}</span>
              </div>
              <div className="tag-selected-row" role="list" aria-label="Selected tags">
                {tagFilters.length === 0 ? (
                  <span className="empty-hint">No tags selected</span>
                ) : (
                  tagFilters.map((t) => (
                    <span key={t} className="tag-sel-chip" role="listitem">
                      <span>#{t}</span>
                      <button type="button" className="x" aria-label={`Remove ${t}`}>
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="tag-find-row">
                <span className="glyph" aria-hidden="true">
                  ⌕
                </span>
                <input type="text" className="tag-find-input" placeholder="Find a tag…" readOnly aria-label="Find a tag" />
              </div>
              {tagBrowse ? (
                <>
                  <div className="tag-browse-toolbar">
                    <span className="tag-sublabel">All tags · {TAG_CORPUS.length}</span>
                    <div className="tag-sort-seg" role="group" aria-label="Sort tags">
                      <button type="button" className="active">
                        Popular
                      </button>
                      <button type="button">A–Z</button>
                    </div>
                  </div>
                  <div className="tag-list" role="listbox" aria-label="All tags">
                    {TAG_CORPUS.map((t) => {
                      const on = tagFilters.includes(t.label);
                      return (
                        <button
                          key={t.label}
                          type="button"
                          className={`tag-list-row ${on ? "selected" : ""}`}
                          role="option"
                          aria-selected={on}
                        >
                          <span className="tag-list-label">#{t.label}</span>
                          <span className="tag-list-n">{t.n}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="tag-sublabel">Popular</div>
                  <div className="tag-popular-row">
                    {TAG_CORPUS.slice(0, 5).map((t) => {
                      const on = tagFilters.includes(t.label);
                      return (
                        <button
                          key={t.label}
                          type="button"
                          className={`tag-filter-chip ${on ? "active" : ""}`}
                          aria-pressed={on}
                        >
                          #{t.label}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" className="tag-browse-toggle">
                    Browse all tags
                  </button>
                </>
              )}
            </div>
          )}
          <div className="filter-foot">
            <span className="hint">{activeN ? `${activeN} active` : "Find tags · refine results"}</span>
            <button type="button" className="search-clear-filters" disabled={!activeN} style={!activeN ? { opacity: 0.35, pointerEvents: "none" } : undefined}>
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Marginalia — invite · collapsed · expanded tray
   ───────────────────────────────────────────────────────────── */
function Marginalia({ h, mode = "auto", forceExpanded = false }) {
  const notes = (h && h.notes) || "";
  const tags = (h && h.tags) || [];
  const noteEmpty = !notes.trim();
  const tagsEmpty = tags.length === 0;
  const hasContent = !noteEmpty || !tagsEmpty;

  let state = mode;
  if (mode === "auto") {
    if (forceExpanded) state = "expanded";
    else if (!hasContent) state = "invite";
    else state = "collapsed";
  }

  if (state === "invite") {
    return (
      <div className="marg-shell">
        <button type="button" className="marg-invite" aria-label="+ Add note or tags">
          <span>+ Add note or tags</span>
        </button>
      </div>
    );
  }

  if (state === "collapsed") {
    const visible = tags.slice(0, 2);
    const overflow = Math.max(0, tags.length - 2);
    return (
      <div className="marg-shell">
        <button type="button" className="marg-collapsed" aria-label="Edit note and tags">
          {!noteEmpty && <span className="note-snip">{notes}</span>}
          {!tagsEmpty && (
            <div className="marg-tags">
              {visible.map((t) => (
                <span key={t} className="tag-pill readonly">
                  <span className="tag-label">{t}</span>
                </span>
              ))}
              {overflow > 0 && <span className="tag-more">+{overflow}</span>}
            </div>
          )}
        </button>
      </div>
    );
  }

  // expanded tray
  const bothEmpty = noteEmpty && tagsEmpty;
  return (
    <div className="marg-shell">
      <div
        className={`marg-tray ${bothEmpty ? "is-empty" : ""}`}
        data-testid="marginalia-tray"
        tabIndex={-1}
      >
        <textarea
          className={`marg-note ${noteEmpty ? "is-empty-field" : ""}`}
          rows={1}
          placeholder="What stood out?"
          defaultValue={notes}
          readOnly
          aria-label="Highlight note"
        />
        <form className={`marg-tag-row ${tagsEmpty ? "is-empty-tags" : ""} marg-tag-form`} onSubmit={(e) => e.preventDefault()}>
          {tags.map((t) => (
            <span key={t} className="tag-pill">
              <span className="tag-label">{t}</span>
              <button type="button" aria-label={`Remove tag ${t}`}>
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            className={`marg-tag-input ${tagsEmpty ? "is-empty-field" : ""}`}
            placeholder={tagsEmpty ? "Add tag…" : ""}
            readOnly
            aria-label="Add tag"
          />
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Highlight cards
   ───────────────────────────────────────────────────────────── */
function HlCard({
  h,
  showMeta = true,
  margMode = "auto",
  forceExpandedMarg = false,
  editing = false,
  quoteClamped = true,
  matchBadge,
}) {
  if (editing) {
    return (
      <div className="hl-card is-editing">
        <div className="edit-label">Markdown</div>
        <textarea className="edit-area" defaultValue={h.quote} readOnly aria-label="Edit highlight markdown" />
        <p className="edit-hint">Ctrl/Cmd+B bold · I italic · E code</p>
        <div className="preview-box">
          <div className="edit-label" style={{ marginBottom: 6 }}>
            Preview
          </div>
          <div className="quote">
            <span className="qmark">“</span>
            {h.quote}
          </div>
        </div>
        {showMeta && (
          <button type="button" className="meta-link">
            {h.domain}
            {h.path && h.path !== "/" ? h.path : ""}
          </button>
        )}
        <div className="actions" data-testid="highlight-action-row">
          <div className="actions-start">
            <Marginalia h={h} forceExpanded />
          </div>
          <div className="actions-end">
            <BtnText className="save-act">Save</BtnText>
            <BtnText muted>Cancel</BtnText>
            <BtnText>Copy</BtnText>
            <BtnText danger>Delete</BtnText>
          </div>
        </div>
      </div>
    );
  }

  const long = (h.quote || "").length > 120;
  return (
    <div className="hl-card">
      <div className={`quote ${long && quoteClamped ? "clamped" : ""}`}>
        <span className="qmark">“</span>
        {h.quote}
      </div>
      {long && (
        <button type="button" className="quote-toggle">
          {quoteClamped ? "Show more ▾" : "Show less ▴"}
        </button>
      )}
      {showMeta && (
        <button type="button" className="meta-link">
          {h.domain}
          {h.path && h.path !== "/" ? h.path : ""}
        </button>
      )}
      <div className="actions" data-testid="highlight-action-row">
        <div className="actions-start">
          <Marginalia h={h} mode={margMode} forceExpanded={forceExpandedMarg} />
        </div>
        <div className="actions-end">
          <BtnText className="edit-act">Edit</BtnText>
          <BtnText>Copy</BtnText>
          <BtnText danger>Delete</BtnText>
        </div>
      </div>
      {matchBadge ? <div className="match-badge">{matchBadge}</div> : null}
    </div>
  );
}

function HlCardHome({ h, quoteExpanded = false }) {
  const notes = (h.notes || "").trim();
  const tags = h.tags || [];
  const visible = tags.slice(0, 2);
  const overflow = Math.max(0, tags.length - 2);
  const long = (h.quote || "").length > 120;
  return (
    <article className="hl-card-home">
      <div className={`hch-quote ${quoteExpanded ? "expanded" : ""}`}>
        <span className="qmark">“</span>
        {h.quote}
      </div>
      {long && (
        <button type="button" className="quote-toggle">
          {quoteExpanded ? "Show less ▴" : "Show more ▾"}
        </button>
      )}
      {notes ? <div className="hch-note">{notes}</div> : null}
      {tags.length > 0 && (
        <div className="hch-tags" aria-label="Tags">
          {visible.map((t) => (
            <span key={t} className="tag-pill">
              {t}
            </span>
          ))}
          {overflow > 0 && <span className="tag-more">+{overflow}</span>}
        </div>
      )}
      <div className="hch-foot">
        <button type="button" className="meta-link">
          {h.domain}
          {h.path && h.path !== "/" ? h.path : ""}
        </button>
        <div className="hch-actions">
          <BtnText>Copy</BtnText>
          <BtnText>Open</BtnText>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────
   Library / domain / section rows
   ───────────────────────────────────────────────────────────── */
function DomainRow({ domain, count, showActions = true }) {
  return (
    <div className="domain-item">
      <button type="button" className="domain-main">
        <span className="domain-favicon" aria-hidden="true">
          {String(domain).replace(/^www\./i, "").slice(0, 1).toUpperCase()}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="title">{domain}</div>
          <div className="sub">
            {count} highlight{count === 1 ? "" : "s"}
          </div>
        </div>
      </button>
      {showActions && <ScopeRowActions kind="domain" />}
    </div>
  );
}

function SectionRow({ path, count }) {
  return (
    <div className="section-item">
      <button type="button" className="section-row">
        <span className="sr-path">{path}</span>
        <span className="sr-count">{count}</span>
      </button>
      <ScopeRowActions kind="section" />
    </div>
  );
}

function PageHeader({ title, kicker, titleClass = "", actions }) {
  return (
    <div className="scope-head">
      <div className="scope-head-text">
        <h2 className={`page-title ${titleClass}`.trim()}>{title}</h2>
        {kicker && <p className="page-kicker">{kicker}</p>}
      </div>
      {actions}
    </div>
  );
}

/* Export for screen modules (UMD / babel global) */
window.V3 = {
  MODES,
  modeById,
  DOMAINS,
  HIGHLIGHTS,
  REFINE_OPTS,
  TAG_CORPUS,
  totalHighlights,
  totalDomains,
  TitleStrip,
  ModeHeaderBar,
  TabBar,
  PopupShell,
  Seg,
  Switch,
  Row,
  HlCard,
  HlCardHome,
  Marginalia,
  SearchBar,
  DomainRow,
  SectionRow,
  PageHeader,
  ScopeRowActions,
  EmptyState,
  Btn,
  BtnText,
};
