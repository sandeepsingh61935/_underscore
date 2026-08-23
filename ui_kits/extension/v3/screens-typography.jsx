// Typography panel — full extension surface (typography-settings-plan.md)
// Presets · Fonts · Scale · Spacing · Margins · Import · Specimen · Apply/Reset

const { PopupShell, Btn } = window.V3;

// Prefixed to avoid clash with type-presets.js globals in Babel shared scope
const V3_TYPE_PRESETS = {
  editorial: { name: "Editorial", serif: "Source Serif 4", sans: "Inter", mono: "JetBrains Mono" },
  classic: { name: "Classic", serif: "Playfair Display", sans: "Source Sans 3", mono: "IBM Plex Mono" },
  modern: { name: "Modern", serif: "Fraunces", sans: "Manrope", mono: "Geist Mono" },
  humanist: { name: "Humanist", serif: "Lora", sans: "Work Sans", mono: "Roboto Mono" },
  "ibm-plex": { name: "IBM Plex", serif: "IBM Plex Serif", sans: "IBM Plex Sans", mono: "IBM Plex Mono" },
  merriweather: { name: "Merriweather", serif: "Merriweather", sans: "Open Sans", mono: "Roboto Mono" },
  "space-tech": { name: "Space Tech", serif: "Space Grotesk", sans: "Inter", mono: "Space Mono" },
  "crimson-pro": { name: "Crimson Pro", serif: "Crimson Pro", sans: "Mulish", mono: "Fira Code" },
};

const V3_FONT_CATALOG = {
  serif: ["Source Serif 4", "Playfair Display", "Lora", "Merriweather", "Libre Baskerville", "Fraunces", "IBM Plex Serif"],
  sans: ["Inter", "Roboto", "Open Sans", "Source Sans 3", "Manrope", "Work Sans", "DM Sans"],
  mono: ["JetBrains Mono", "IBM Plex Mono", "Roboto Mono", "Fira Code", "Space Mono", "Geist Mono"],
};

const V3_SCALE_META = [
  { id: "step-3", label: "Display", hint: "Library title", value: "22px" },
  { id: "step-2", label: "Domain", hint: "Domain name", value: "18px" },
  { id: "step-0", label: "Section", hint: "Sub-domain caps", value: "13px" },
  { id: "step-1", label: "Body", hint: "Highlight quote", value: "15px" },
  { id: "step--2", label: "Meta", hint: "Labels and timestamps", value: "10px" },
];

const V3_SPACING_META = [
  { key: "displayLh", label: "Display line height", value: "1.00" },
  { key: "bodyLh", label: "Body line height", value: "1.45" },
  { key: "sectionTrack", label: "Section tracking", value: "0.16em" },
  { key: "displayTrack", label: "Display tracking", value: "-0.025em" },
];

const V3_MARGIN_META = [
  { key: "rowHeight", label: "Row height", value: "44px" },
  { key: "sectionGap", label: "Section gap", value: "12px" },
  { key: "insetPadding", label: "Inset padding", value: "16px" },
  { key: "specimenPadding", label: "Specimen padding", value: "14px" },
];

function WheelMini({ items, selectedIndex = 1, compact = false }) {
  const start = Math.max(0, selectedIndex - 1);
  const slice = items.slice(start, start + 3);
  while (slice.length < 3) slice.push("");
  return (
    <div className={`wpick ${compact ? "compact" : ""}`} aria-hidden="true">
      <div className="wpick-fade-t" />
      <div className="wpick-track">
        {slice.map((lab, i) => (
          <div key={i} className={`wpick-row ${i === 1 ? "sel" : ""}`}>
            <span className="lab">{lab}</span>
          </div>
        ))}
      </div>
      <div className="wpick-band" />
      <div className="wpick-fade-b" />
    </div>
  );
}

function TypeSec({ title, values, open = false, children }) {
  return (
    <div className="type-sec">
      <button type="button" className="type-sec-head">
        <span className="t">{title}</span>
        <span className="v">
          {values} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && <div className="type-sec-body">{children}</div>}
    </div>
  );
}

function TypeSpecimen({ preset = V3_TYPE_PRESETS.editorial, pad = 14 }) {
  return (
    <div
      className="specimen"
      style={{
        margin: "8px 16px 4px",
        padding: pad,
        border: "1px solid var(--rule-soft)",
        background: "var(--paper)",
      }}
    >
      <div className="u-serif" style={{ fontSize: 22, letterSpacing: "-0.025em", lineHeight: 1.0 }}>
        Library
      </div>
      <div className="u-serif" style={{ fontSize: 15, lineHeight: 1.45, marginTop: 8, color: "var(--ink-2)" }}>
        “Cascading resolves conflicts when multiple CSS rules apply.”
      </div>
      <div
        className="u-mono"
        style={{
          fontSize: 10,
          color: "var(--ink-3)",
          marginTop: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {preset.serif} · {preset.sans} · {preset.mono}
      </div>
    </div>
  );
}

function TySettingsHead() {
  return (
    <div className="settings-head">
      <h2 className="settings-title">Settings</h2>
      <button type="button" className="settings-close" aria-label="Close">
        ×
      </button>
    </div>
  );
}

/** Full typography panel — presets open (primary entry). */
function TypographyPanelFull({ presetId = "editorial", openSec = "presets" }) {
  const p = V3_TYPE_PRESETS[presetId] || V3_TYPE_PRESETS.editorial;
  const presetNames = Object.values(V3_TYPE_PRESETS).map((x) => x.name);
  const presetIx = Math.max(
    0,
    Object.keys(V3_TYPE_PRESETS).indexOf(presetId)
  );

  return (
    <PopupShell title="_underscore · settings" modeId="pro" activeTab="settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <TySettingsHead />
        <div className="list-scroll" style={{ flex: 1, overflow: "auto" }}>
          <button type="button" className="row" style={{ background: "var(--paper-2)" }}>
            <div>
              <div className="title">Typography</div>
              <div className="sub">
                {p.name} · {p.serif}
              </div>
            </div>
            <span className="trail">▾</span>
          </button>

          <TypeSpecimen preset={p} />

          <div style={{ padding: "0 16px 16px" }}>
            <TypeSec title="Presets" values={p.name} open={openSec === "presets"}>
              <WheelMini items={presetNames} selectedIndex={presetIx} />
              <div className="preset-scroll" style={{ marginTop: 10 }}>
                {Object.entries(V3_TYPE_PRESETS).map(([id, pr]) => (
                  <button
                    key={id}
                    type="button"
                    className={`preset-chip ${id === presetId ? "active" : ""}`}
                  >
                    {pr.name}
                  </button>
                ))}
              </div>
            </TypeSec>

            <TypeSec title="Fonts" values={`${p.serif.slice(0, 12)}…`} open={openSec === "fonts"}>
              <div className="role-tabs">
                {["serif", "sans", "mono"].map((r, i) => (
                  <button key={r} type="button" className={`role-tab ${i === 0 ? "active" : ""}`}>
                    {r}
                    <span className="rv">{p[r]}</span>
                  </button>
                ))}
              </div>
              <WheelMini items={V3_FONT_CATALOG.serif} selectedIndex={0} />
            </TypeSec>

            <TypeSec title="Scale" values="22 · 18 · 15" open={openSec === "scale"}>
              {V3_SCALE_META.map((s) => (
                <div key={s.id} className="token-row" style={{ alignItems: "flex-start", padding: "10px 0" }}>
                  <div style={{ paddingTop: 8, minWidth: 0, flex: 1 }}>
                    <div className="lab">{s.label}</div>
                    <div className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>
                      {s.hint}
                    </div>
                  </div>
                  <div style={{ width: 72, flexShrink: 0 }}>
                    <WheelMini
                      compact
                      items={["20px", s.value, "24px"]}
                      selectedIndex={1}
                    />
                  </div>
                </div>
              ))}
            </TypeSec>

            <TypeSec title="Spacing" values="LH 1.45" open={openSec === "spacing"}>
              {V3_SPACING_META.map((s) => (
                <div key={s.key} className="token-row" style={{ alignItems: "flex-start", padding: "10px 0" }}>
                  <div className="lab" style={{ paddingTop: 8, flex: 1 }}>
                    {s.label}
                  </div>
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <WheelMini compact items={["prev", s.value, "next"]} selectedIndex={1} />
                  </div>
                </div>
              ))}
            </TypeSec>

            <TypeSec title="Margins" values="44 · 12 · 16" open={openSec === "margins"}>
              {V3_MARGIN_META.map((s) => (
                <div key={s.key} className="token-row" style={{ alignItems: "flex-start", padding: "10px 0" }}>
                  <div className="lab" style={{ paddingTop: 8, flex: 1 }}>
                    {s.label}
                  </div>
                  <div style={{ width: 72, flexShrink: 0 }}>
                    <WheelMini compact items={["42px", s.value, "46px"]} selectedIndex={1} />
                  </div>
                </div>
              ))}
            </TypeSec>

            <TypeSec title="Import fonts" values="None" open={openSec === "import"}>
              <div className="import-zone">
                <div style={{ fontSize: "var(--step--1)", fontWeight: 500 }}>Drop .woff2 or .ttf</div>
                <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
                  Assigns to serif role
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                  <Btn variant="ghost" size="sm">
                    Upload
                  </Btn>
                  <Btn variant="ghost" size="sm">
                    Remove
                  </Btn>
                </div>
              </div>
            </TypeSec>

            <div style={{ display: "flex", gap: 8, marginTop: 14, paddingBottom: 8 }}>
              <button type="button" className="btn primary sm" style={{ flex: 1 }}>
                Apply
              </button>
              <button type="button" className="btn ghost sm" style={{ flex: 1 }}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function TypographyFontsOpen() {
  return <TypographyPanelFull openSec="fonts" />;
}

function TypographyScaleOpen() {
  return <TypographyPanelFull openSec="scale" />;
}

function TypographyModernPreset() {
  return <TypographyPanelFull presetId="modern" openSec="presets" />;
}

/** Standalone specimen + hierarchy map (not inside Settings). */
function TypographyHierarchySpec() {
  return (
    <div className="ue" style={{ width: 400, padding: 20, background: "var(--paper)", border: "1px solid var(--rule)" }}>
      <div className="u-serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
        Type roles
      </div>
      <div style={{ marginTop: 16, borderTop: "1px solid var(--rule-soft)" }}>
        {[
          { role: "Display", face: "Source Serif 4", size: "22px", sample: "Library", family: "serif" },
          { role: "Domain", face: "Source Serif 4", size: "18px", sample: "developer.mozilla.org", family: "serif" },
          { role: "Section", face: "Inter", size: "13px", sample: "/en-US/docs/Web/CSS", family: "sans" },
          { role: "Body / Quote", face: "Source Serif 4", size: "15px", sample: "Cascading is the algorithm…", family: "serif" },
          { role: "Meta", face: "JetBrains Mono", size: "10px", sample: "3 DOMAINS · 12 HIGHLIGHTS", family: "mono" },
        ].map((r) => (
          <div key={r.role} style={{ padding: "12px 0", borderBottom: "1px solid var(--rule-soft)" }}>
            <div className="u-mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              {r.role} · {r.size} · {r.face}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily:
                  r.family === "serif"
                    ? "var(--serif)"
                    : r.family === "mono"
                      ? "var(--mono)"
                      : "var(--sans)",
                fontSize: r.size,
                letterSpacing: r.family === "mono" ? "0.1em" : r.role === "Display" ? "-0.025em" : undefined,
                lineHeight: r.role === "Display" ? 1 : 1.35,
              }}
            >
              {r.sample}
            </div>
          </div>
        ))}
      </div>
      <p className="u-mono" style={{ marginTop: 12, fontSize: 10, color: "var(--ink-3)", lineHeight: 1.45 }}>
        Settings → Typography writes these tokens app-wide.
      </p>
    </div>
  );
}

function TypographyCollapsedRow() {
  return (
    <PopupShell title="_underscore · settings" modeId="pro" activeTab="settings">
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TySettingsHead />
        <div className="list-scroll" style={{ flex: 1 }}>
          <button type="button" className="row">
            <div>
              <div className="title">Typography</div>
              <div className="sub">Editorial · Source Serif 4</div>
            </div>
            <span className="trail">▸</span>
          </button>
          <div className="u-caps" style={{ padding: "10px 16px 4px", color: "var(--ink-3)" }}>
            Appearance
          </div>
          <div style={{ padding: "8px 16px" }}>
            <div className="title" style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              Theme
            </div>
            <div className="seg">
              <button type="button" className="active">
                light
              </button>
              <button type="button">dark</button>
              <button type="button">system</button>
            </div>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

window.V3Typography = {
  TYPE_PRESETS: V3_TYPE_PRESETS,
  TypographyPanelFull,
  TypographyFontsOpen,
  TypographyScaleOpen,
  TypographyModernPreset,
  TypographyHierarchySpec,
  TypographyCollapsedRow,
  TypeSpecimen,
};
