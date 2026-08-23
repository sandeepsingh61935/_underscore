// Home — Anchor + Stream (home-page-design-plan.md)
// Replaces v2 stats/hero stack with pinned Current page + Recent feed.

const { PopupShell, HIGHLIGHTS, HlCardHome } = window.V3;

function HomeStatus({ guest, nHl, nDom }) {
  if (guest) {
    return (
      <div className="home-status">
        <span className="ui-status plain">Local only · {nHl} highlights · {nDom} domains</span>
      </div>
    );
  }
  return (
    <div className="home-status">
      <span className="ui-status plain">Alex · {nHl} highlights · {nDom} domains</span>
    </div>
  );
}

function HomeAnchor({ empty = false, modeId = "basic" }) {
  if (empty) {
    return (
      <div className="home-anchor home-anchor-empty">
        <div className="home-anchor-btn" style={{ cursor: "default" }}>
          <div className="home-anchor-head">
            <h2 className="home-anchor-domain">No page open</h2>
          </div>
          <div className="home-anchor-meta">
            <span>Open a page with highlights to pin it</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="home-anchor">
      <button type="button" className="home-anchor-btn">
        <div className="home-anchor-head">
          <h2 className="home-anchor-domain">developer.mozilla.org</h2>
          <span className="home-anchor-trail">Open →</span>
        </div>
        <div className="home-anchor-meta">
          <span className="ham-path">/en-US/docs/Web/CSS</span>
          <span className="hs-sep" aria-hidden="true">
            ·
          </span>
          <span>5 on this page</span>
        </div>
      </button>
      {modeId === "pro_xai" && (
        <div className="home-anchor-ask-row">
          <button type="button" className="home-page-ask">
            Ask about this page
          </button>
        </div>
      )}
    </div>
  );
}

function HomeFirstRun({ guest = true, modeId = "basic" }) {
  return (
    <PopupShell title="_underscore" modeId={modeId} activeTab="home">
      <div className="screen-enter home-root">
        <div className="home-stream">
          <div className="home-first-run">
            <p className="fr-title">No highlights yet</p>
            <p className="fr-body">
              Select text on a page to save it {guest ? "on this device" : "to your library"}.
            </p>
            {guest && (
              <button type="button" className="home-soft-cta">
                Sign in to sync
              </button>
            )}
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function HomeGuest() {
  const recent = HIGHLIGHTS.slice(0, 3);
  return (
    <PopupShell title="_underscore" modeId="basic" activeTab="home">
      <div className="screen-enter home-root">
        <div className="home-top">
          <HomeStatus guest nHl={5} nDom={3} />
          <HomeAnchor modeId="basic" />
        </div>
        <div className="home-stream">
          <div className="home-section-head">
            <span className="home-section-label">Recent</span>
            <span className="home-section-meta">{HIGHLIGHTS.length}</span>
          </div>
          {recent.map((h) => (
            <HlCardHome key={h.id} h={h} />
          ))}
          <button type="button" className="recent-toggle">
            Show more · {HIGHLIGHTS.length - recent.length}
          </button>
        </div>
      </div>
    </PopupShell>
  );
}

function HomeStarter() {
  return (
    <PopupShell title="_underscore" modeId="pro" activeTab="home">
      <div className="screen-enter home-root">
        <div className="home-top">
          <HomeStatus guest={false} nHl={24} nDom={6} />
          <HomeAnchor modeId="pro" />
        </div>
        <div className="home-stream">
          <div className="home-section-head">
            <span className="home-section-label">Recent</span>
            <span className="home-section-meta">24</span>
          </div>
          {HIGHLIGHTS.map((h) => (
            <HlCardHome key={h.id} h={h} />
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

function HomePro() {
  return (
    <PopupShell title="_underscore" modeId="pro_xai" activeTab="home">
      <div className="screen-enter home-root">
        <div className="home-top">
          <HomeStatus guest={false} nHl={51} nDom={9} />
          <HomeAnchor modeId="pro_xai" />
        </div>
        <div className="home-stream">
          <div className="home-section-head">
            <span className="home-section-label">Recent</span>
            <span className="home-section-meta">51</span>
          </div>
          {HIGHLIGHTS.map((h) => (
            <HlCardHome key={h.id} h={h} />
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

function HomeDark() {
  return (
    <PopupShell title="_underscore" modeId="pro" activeTab="home" dark>
      <div className="screen-enter home-root">
        <div className="home-top">
          <HomeStatus guest={false} nHl={24} nDom={6} />
          <HomeAnchor modeId="pro" />
        </div>
        <div className="home-stream">
          <div className="home-section-head">
            <span className="home-section-label">Recent</span>
            <span className="home-section-meta">24</span>
          </div>
          {HIGHLIGHTS.slice(0, 3).map((h) => (
            <HlCardHome key={h.id} h={h} />
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

window.V3Home = {
  HomeFirstRun,
  HomeGuest,
  HomeStarter,
  HomePro,
  HomeDark,
};
