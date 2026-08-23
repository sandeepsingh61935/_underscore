// Library · Domain · Section — search/filter, list rows, highlight + marginalia
// Matches Web-Prototype renderSearchBar / hlCard / renderMarginalia patterns.

const {
  PopupShell,
  DOMAINS,
  HIGHLIGHTS,
  Btn,
  BtnText,
  SearchBar,
  HlCard,
  DomainRow,
  SectionRow,
  PageHeader,
  ScopeRowActions,
  EmptyState,
  Marginalia,
} = window.V3;

function LibraryList({ modeId = "pro" }) {
  return (
    <PopupShell title="_underscore · library" modeId={modeId} activeTab="collections">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div className="screen-scroll" style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <div style={{ padding: "10px 16px 0" }}>
            <h2 className="page-title">Library</h2>
            <p className="page-kicker">
              {DOMAINS.length} domains · {HIGHLIGHTS.length} highlights
            </p>
          </div>
          <div style={{ padding: "10px 16px 0" }}>
            <SearchBar />
          </div>
          <div style={{ marginTop: 4 }}>
            {DOMAINS.map((d) => (
              <DomainRow key={d.domain} domain={d.domain} count={d.count} showActions={modeId === "pro_xai"} />
            ))}
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function LibraryEmpty({ modeId = "basic" }) {
  return (
    <PopupShell title="_underscore · library" modeId={modeId} activeTab="collections">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "10px 16px 0" }}>
          <h2 className="page-title">Library</h2>
          <p className="page-kicker">0 domains · 0 highlights</p>
        </div>
        <div style={{ padding: "10px 16px 0" }}>
          <SearchBar />
        </div>
        <EmptyState title="Library is empty" body="Highlights you save will appear here by domain" />
      </div>
    </PopupShell>
  );
}

function LibrarySearchResults({ modeId = "pro" }) {
  const hits = HIGHLIGHTS.filter((h) => /cascade|css|specificity/i.test(h.quote + (h.notes || "") + (h.tags || []).join(" ")));
  return (
    <PopupShell title="_underscore · library" modeId={modeId} activeTab="collections">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div className="screen-scroll" style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "10px 16px 0" }}>
            <h2 className="page-title">Library</h2>
            <p className="page-kicker">
              {DOMAINS.length} domains · {HIGHLIGHTS.length} highlights
            </p>
          </div>
          <div style={{ padding: "10px 16px 0" }}>
            <SearchBar
              query="cascade"
              fields={["text"]}
              refine={["has_tags"]}
              tagFilters={["css"]}
              resultCount={hits.length}
            />
          </div>
          {hits.map((h) => (
            <HlCard key={h.id} h={h} showMeta matchBadge="Text · Tags" />
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

function LibraryFilterOpen({ modeId = "pro", tagBrowse = false }) {
  return (
    <PopupShell title="_underscore · library" modeId={modeId} activeTab="collections">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div className="screen-scroll" style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "10px 16px 0" }}>
            <h2 className="page-title">Library</h2>
            <p className="page-kicker">
              {DOMAINS.length} domains · {HIGHLIGHTS.length} highlights
            </p>
          </div>
          <div style={{ padding: "10px 16px 8px" }}>
            <SearchBar
              query=""
              filterOpen
              fields={["text", "notes"]}
              refine={["needs_note"]}
              tagFilters={["css", "cascade"]}
              tagBrowse={tagBrowse}
            />
          </div>
          {DOMAINS.map((d) => (
            <DomainRow key={d.domain} domain={d.domain} count={d.count} showActions={false} />
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

function LibraryFilterBrowseTags() {
  return <LibraryFilterOpen tagBrowse />;
}

function LibraryNoMatches() {
  return (
    <PopupShell title="_underscore · library" modeId="pro" activeTab="collections">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ padding: "10px 16px 0" }}>
          <h2 className="page-title">Library</h2>
          <p className="page-kicker">3 domains · 5 highlights</p>
        </div>
        <div style={{ padding: "10px 16px 0" }}>
          <SearchBar query="zzzzz" fields={["text", "notes", "tags"]} resultCount={0} refine={["has_notes"]} />
        </div>
        <EmptyState
          title="No matches"
          body="Clear filters or try another query"
          action={
            <Btn variant="ghost" size="sm">
              Clear search
            </Btn>
          }
        />
      </div>
    </PopupShell>
  );
}

function DomainView({ modeId = "pro_xai" }) {
  const d = DOMAINS[0];
  return (
    <PopupShell title="_underscore · library" modeId={modeId} activeTab="collections" backLabel="Library">
      <div className="screen-enter domain-layout">
        <div className="domain-main screen-scroll">
          <PageHeader
            title={d.domain}
            kicker={`${d.count} highlights · ${d.sections.length} sections`}
            titleClass="page-title-domain"
            actions={modeId === "pro_xai" ? <ScopeRowActions kind="domain" /> : null}
          />
          {modeId === "pro_xai" && (
            <div style={{ padding: "0 16px 8px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="ghost" size="sm">
                Synthesize this domain
              </Btn>
              <Btn variant="ghost" size="sm" danger>
                Delete domain
              </Btn>
            </div>
          )}
          <div style={{ padding: "0 16px 8px" }}>
            <SearchBar placeholder="Search in domain…" />
          </div>
          <div className="u-caps" style={{ padding: "8px 16px 4px", color: "var(--ink-3)" }}>
            Sections
          </div>
          {d.sections.map((s) => (
            <SectionRow key={s.path} path={s.path} count={s.count} />
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

function SectionView({ modeId = "pro_xai" }) {
  const hs = HIGHLIGHTS.filter((h) => h.domain === "developer.mozilla.org");
  return (
    <PopupShell
      title="_underscore · library"
      modeId={modeId}
      activeTab="collections"
      backLabel="developer.mozilla.org"
    >
      <div className="screen-enter domain-layout">
        <div className="domain-main screen-scroll">
          <PageHeader
            title="/en-US/docs/Web/CSS"
            kicker={`${hs.length} highlights`}
            titleClass="page-title-section"
            actions={modeId === "pro_xai" ? <ScopeRowActions kind="section" /> : null}
          />
          {modeId === "pro_xai" && (
            <div style={{ padding: "0 16px 8px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="ghost" size="sm">
                Summarize this section
              </Btn>
              <Btn variant="ghost" size="sm" danger>
                Delete section
              </Btn>
            </div>
          )}
          <div style={{ padding: "8px 16px 0" }}>
            <SearchBar placeholder="Search highlights…" />
          </div>
          {hs.map((h) => (
            <HlCard key={h.id} h={h} showMeta={false} />
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

/** Highlight list item states — notes/tags */
function HighlightStatesGallery() {
  const empty = { id: "e", quote: "Fetch is the modern replacement for XMLHttpRequest.", domain: "developer.mozilla.org", path: "/en-US/docs/Web/API", notes: "", tags: [] };
  const noteOnly = { id: "n", quote: "Specificity is a weight that is applied to a given CSS declaration.", domain: "developer.mozilla.org", path: "/en-US/docs/Web/CSS", notes: "Core cascade mental model", tags: [] };
  const tagsOnly = { id: "t", quote: "Ship the smallest thing that proves the risk.", domain: "news.ycombinator.com", path: "/item", notes: "", tags: ["shipping", "risk"] };
  const both = HIGHLIGHTS[0];
  const manyTags = {
    ...HIGHLIGHTS[0],
    id: "m",
    tags: ["css", "fundamentals", "cascade", "specificity", "layout", "browser"],
  };

  return (
    <PopupShell title="_underscore · library" modeId="pro" activeTab="collections" backLabel="Library">
      <div className="screen-enter domain-layout">
        <div className="domain-main screen-scroll">
          <div style={{ padding: "12px 16px 4px" }}>
            <h2 className="page-title page-title-section">/en-US/docs/Web/API</h2>
            <p className="page-kicker">6 highlights · note/tag states</p>
          </div>

          <HlCard h={empty} showMeta={false} margMode="invite" />
          <HlCard h={noteOnly} showMeta={false} margMode="collapsed" />
          <HlCard h={manyTags} showMeta={false} margMode="collapsed" />
          <HlCard h={both} showMeta={false} margMode="expanded" />
          <HlCard h={empty} showMeta={false} margMode="expanded" />
          <HlCard h={tagsOnly} showMeta={false} editing />
        </div>
      </div>
    </PopupShell>
  );
}

function ControlsConsistencySpec() {
  return (
    <div className="ue" style={{ width: 400, padding: 16, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>
        Controls
      </div>
      <p className="u-sans" style={{ fontSize: 12, color: "var(--ink-3)", margin: "6px 0 0", lineHeight: 1.4 }}>
        Filled actions use .btn. List actions use mono text. ▸ is disclosure only.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <Btn variant="primary" size="sm">Save</Btn>
        <Btn variant="accent" size="sm">Upgrade</Btn>
        <Btn variant="ghost" size="sm">Cancel</Btn>
        <Btn variant="ghost" size="sm" danger>Delete</Btn>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center" }}>
        <BtnText>Edit</BtnText>
        <BtnText>Copy</BtnText>
        <BtnText danger>Delete</BtnText>
      </div>

      <div className="filter-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        <button type="button" className="field-chip active"><span className="check">✓</span>Text</button>
        <button type="button" className="field-chip">Notes</button>
        <button type="button" className="refine-chip active">Has notes</button>
        <button type="button" className="tag-filter-chip active">#css</button>
      </div>

      <div style={{ marginTop: 14 }}>
        <Marginalia h={{ notes: "", tags: [] }} mode="invite" />
        <div style={{ height: 6 }} />
        <Marginalia h={{ notes: "Cascade order", tags: ["css"] }} mode="collapsed" />
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <ScopeRowActions kind="domain" />
        <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>ask · delete</span>
      </div>
    </div>
  );
}

window.V3Library = {
  LibraryList,
  LibraryEmpty,
  LibrarySearchResults,
  LibraryFilterOpen,
  LibraryFilterBrowseTags,
  LibraryNoMatches,
  DomainView,
  SectionView,
  HighlightStatesGallery,
  ControlsConsistencySpec,
};
