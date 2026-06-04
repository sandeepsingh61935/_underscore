# V2 Popup Redesign — Full Specification

> **Scope**: Chrome extension popup (400x600) only. Web app deferred.
> **Design direction**: V2 editorial wireframes (warm paper, serif display, single accent).
> **Source of truth**: `ui_kits/extension/v2/` — wireframe JSX code IS the spec.

---

## 1. Strategic Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Design direction | V2 editorial wireframes | Warm paper-first, editorial aesthetic (NYT/Guardian/Anthropic) |
| Motion system | MASTER-BRIEF Framer Motion springs | Wireframes punted on motion; MASTER-BRIEF has production-ready spring presets |
| Typography | Editorial only: Source Serif 4 + Inter + JetBrains Mono | Single preset. No user-selectable font picker. YAGNI. |
| Mode IDs | Full rename: `ephemeral`, `local`, `cloud`, `ai` | Clean slate, no production users, uniform semantics |
| Mode expression | Variant A: Glyph + dot, single accent | Modes distinguished by glyph + label, NOT color |
| Mode selection | Variant A: Editorial stack | Two families (Device/Cloud), serif display, editorial feel |
| Navigation | Variant A: Drill-down | Classic three-level: Collections → Domain → Sub-domain |
| Capture overlay | **Deferred** (future WS-D) | Content-script Shadow DOM complexity, not needed for popup |
| Empty states | All four (A/B/C/D) | Complementary contexts, not competing variants |
| Dark mode | **Light-only for v1** | Editorial warm paper is inherently light. Dark needs own design pass. |
| CSS approach | Pure v2 CSS. **Tailwind fully removed.** | Single design system, no confusion, no hybrid paths |
| Agent guardrails | Wireframe JSX = spec | Agents read wireframe code and translate 1:1 |
| Storybook | **Dropped for now** | Wireframe prototype is the visual reference |
| Old design system | **Full purge** | MD3, Style C, Ink & Glass — all removed |
| Scope | Popup only | Web app deferred to future workstream |

---

## 2. What Gets Removed (Phase 0)

### Tailwind CSS — complete removal
- `tailwindcss`, `@tailwindcss/forms`, `autoprefixer` from `package.json`
- `tailwind.config.ts` — delete
- `postcss.config.js` — delete (or strip to minimal if other PostCSS plugins needed)
- All `@tailwind` directives from CSS files
- All Tailwind utility classes from `.tsx` files (replaced during view rewrites in Phase 1/2)

### MD3 Design System — complete removal
- All `--md-sys-color-*` tokens from `src/ui-system/theme/global.css`
- All MD3-mapped Tailwind utilities (they're gone with Tailwind anyway)
- Legacy Spark Realm HSL variables (`hsl(var(--background))`, `.sepia` theme block)
- Dead `--typography-*` references and utility classes
- `src/ui-system/tokens/` directory (if MD3-specific)

### Agent Rule Files — rewrite for v2
- `GEMINI.md` — rewrite MD3 rules to v2 rules
- `CLAUDE.md` — rewrite MD3 rules to v2 rules
- `.agent/workflows/md3-ui.md` — replace with v2-ui workflow
- `.agent/workflows/md3-tokens-reference.md` — replace with v2 token reference
- `.agent/workflows/ui-preflight.md` — update for v2 checklist
- `.agent/workflows/design-audit.md` — update for v2 compliance

### Old Design Direction Docs — archive
- `docs/redesign/` — move to `docs/archive/redesign-ink-and-glass/`
- `docs/07-design/v2/STYLE_C_HANDOFF.md` — archive (Style C is abandoned)
- `docs/07-design/v2/style-options/` — archive (style exploration complete)

### Storybook — remove (temporarily)
- `.storybook/` config — keep files but remove from build scripts
- `*.stories.tsx` files — leave in place (harmless), but no new ones required

---

## 3. V2 Design System

### 3.1 Token System

Source: `ui_kits/extension/v2/tokens.css`
Target: `src/ui-system/theme/global.css`

#### Paper + Ink (surfaces and text)
```css
--paper:      #f7f5f0;         /* warm off-white — primary background */
--paper-2:    #efece4;         /* deeper paper — secondary/elevated surface */
--rule:       #1a1a1a;         /* heavy rule — primary borders, dark elements */
--rule-soft:  #cfc9bd;         /* hairline — subtle dividers */
--ink:        #111110;         /* primary text */
--ink-2:      #3a3835;         /* secondary text */
--ink-3:      #6b6760;         /* tertiary/muted text */
--ink-4:      #a39e94;         /* faintest text, placeholders */
```

#### Accent (single brand color)
```css
--accent:     oklch(62% 0.12 45);   /* terracotta — the ONE brand color */
--accent-2:   oklch(72% 0.09 45);   /* lighter accent variant */
--accent-ink: #2a1208;              /* text on accent backgrounds */
```

#### Accent Tint Scale
```css
--accent-tint-08: color-mix(in oklch, var(--accent) 8%, transparent);
--accent-tint-18: color-mix(in oklch, var(--accent) 18%, transparent);
--accent-tint-35: color-mix(in oklch, var(--accent) 35%, transparent);
--accent-tint-65: color-mix(in oklch, var(--accent) 65%, transparent);
```

#### Utility Overlays (hover/press states)
```css
--utility-overlay-06: rgba(0, 0, 0, 0.06);
--utility-overlay-08: rgba(0, 0, 0, 0.08);
--utility-overlay-12: rgba(0, 0, 0, 0.12);
--utility-overlay-15: rgba(0, 0, 0, 0.15);
--utility-overlay-25: rgba(0, 0, 0, 0.25);
```

#### Mode Palette (single accent for all modes)
```css
--mode-ephemeral: var(--accent);
--mode-local:     var(--accent);
--mode-cloud:     var(--accent);
--mode-ai:        var(--accent);
```

#### Type Stacks
```css
--serif: "Source Serif 4", "Iowan Old Style", Georgia, serif;
--sans:  "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
--mono:  "JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, monospace;
```

#### Type Scale
```css
--step--2: 10px;
--step--1: 11px;
--step-0:  13px;
--step-1:  15px;
--step-2:  18px;
--step-3:  22px;
--step-4:  28px;
--step-5:  36px;
```

#### Geometry
```css
--pop-w: 400px;
--pop-h: 600px;
--radius: 2px;
```

### 3.2 Semantic CSS Classes

Source: `ui_kits/extension/v2/tokens.css` (lines 173-316)

| Class | Purpose | Definition |
|---|---|---|
| `.u-serif` | Editorial voice: display, headlines, quotes | `font-family: var(--serif); letter-spacing: -0.015em` |
| `.u-mono` | Metadata, kickers, badges | `font-family: var(--mono); letter-spacing: 0` |
| `.u-sans` | UI chrome, body | `font-family: var(--sans)` |
| `.u-caps` | Uppercase tracked small text | `text-transform: uppercase; letter-spacing: 0.12em; font-size: var(--step--2)` |
| `.u-kicker` | Section kicker (mono, uppercase, tracked) | `font-family: var(--mono); font-size: var(--step--2); uppercase; letter-spacing: 0.14em; color: var(--ink-3)` |
| `.u-rule` | Heavy top border | `border-top: 1px solid var(--rule)` |
| `.u-hair` | Hairline top border | `border-top: 1px solid var(--rule-soft)` |
| `.qmark` | Pull-quote opening mark | `font-family: var(--serif); font-style: italic; color: var(--ink-4)` |

### 3.3 Button Variants

Source: `ui_kits/extension/v2/tokens.css` (lines 222-251)

| Class | Appearance |
|---|---|
| `.btn` | Default: paper background, rule border, ink text |
| `.btn.primary` | Inverted: rule background, paper text |
| `.btn.accent` | Brand: accent background, white text |
| `.btn.ghost` | Subtle: rule-soft border, ink-2 text |
| `.btn.sm` | Compact: 32px min-height, smaller padding |

All buttons: `min-height: 44px` (default), `border-radius: var(--radius)`, `font-family: var(--sans)`.

### 3.4 Motion System

Source: MASTER-BRIEF `docs/redesign/00-MASTER-BRIEF.md` (section 5)
File: `src/ui-system/motion/springs.ts` (already exists)

```ts
export const springs = {
  gentle: { type: 'spring', stiffness: 120, damping: 20, mass: 1.0 },
  snappy: { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 },
  bounce: { type: 'spring', stiffness: 400, damping: 22, mass: 0.7 },
  slow:   { type: 'spring', stiffness:  80, damping: 20, mass: 1.2 },
} as const;
```

| Element | Animation | Spring |
|---|---|---|
| Screen/view transition | `opacity` + `y` slide, `AnimatePresence mode="wait"` | `gentle` |
| List items (stagger) | `opacity` + `y: 8`, stagger 40ms | `gentle` |
| Card hover | `y: -2, scale: 1.012` via `whileHover` | `snappy` |
| Card tap | `scale: 0.98` via `whileTap` | `snappy` |

### 3.5 Fonts — Google Fonts URL

Add to `src/entrypoints/popup/index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 4. Mode System Rename

### 4.1 ID Mapping

| Old internal ID | Old display name | New ID | New display name | Family |
|---|---|---|---|---|
| `walk` | Focus | `ephemeral` | Ephemeral | Device |
| `sprint` | Capture | `local` | Local | Device |
| `vault` | Memory | `cloud` | Cloud | Cloud |
| `gen` | Neural | `ai` | AI | Cloud |

### 4.2 Files to Update

| File | Change |
|---|---|
| `src/content/modes/mode-constants.ts` | `MODE_NAMES`: walk->ephemeral, sprint->local, vault->cloud, gen->ai |
| `src/background/schemas/mode-state-schemas.ts` | `ModeTypeSchema`: `z.enum(['ephemeral', 'local', 'cloud', 'ai'])` |
| `src/content/modes/mode-transition-rules.ts` | Full matrix rewrite with new IDs |
| `src/content/modes/mode-state-machine.ts` | References to old IDs |
| `src/ui-system/hooks/usePersistedMode.ts` | `VALID_MODES`, `DEFAULT_MODE`, `AUTH_REQUIRED_MODES` |
| `src/features/modes/registry.ts` | `ModeRegistry.registerDefaults()` — new IDs, names, descriptions |
| `src/features/modes/ModeCard.tsx` | `MODE_ICONS` record keys |
| `src/entrypoints/content.ts` | `MODE_NAMES.SPRINT` -> `MODE_NAMES.LOCAL`, etc. |
| `src/entrypoints/popup/index.tsx` | Any mode string references |
| `src/pages/SettingsPage.tsx` | `MODE_DISPLAY` record |
| `src/features/collections/views/CollectionsView.tsx` | `MODE_DISPLAY`, `AUTH_REQUIRED_MODES` |
| `src/features/collections/views/DomainDetailsView.tsx` | `AUTH_REQUIRED_MODES` |
| `src/content/modes/mode-state-manager.ts` | Default mode references |
| `src/shared/schemas/mode-state-schemas.ts` | Re-export — has `['walk', 'sprint', 'vault', 'neural']`, update to `['ephemeral', 'local', 'cloud', 'ai']` |

### 4.3 Mode Data (from wireframe `primitives.jsx`)

```ts
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
```

---

## 5. Phases & Parallelism

### Phase 0: Foundation (BLOCKING) ✅ DONE

**No parallelism with later phases. Must complete before Phase 1.**

Phase 0 itself can be split into two parallel sub-streams:

#### P0-A: Token & CSS Foundation (parallelizable with P0-B) ✅ DONE
- [x] Remove Tailwind: delete `tailwind.config.ts`, `postcss.config.js`, remove packages
- [x] Purge `src/ui-system/theme/global.css` — remove all MD3 tokens, Spark Realm HSL, dead code
- [x] Migrate `ui_kits/extension/v2/tokens.css` into `src/ui-system/theme/global.css`
- [x] Add Google Fonts link to `src/entrypoints/popup/index.html`
- [x] Verify build passes (`npm run build`)

#### P0-B: Mode Rename & Agent Rules (parallelizable with P0-A) ✅ DONE
- [x] Rename mode IDs in all files listed in Section 4.2
- [x] Rewrite `GEMINI.md` with v2 design rules
- [x] Rewrite `CLAUDE.md` with v2 design rules
- [x] Update `.agent/workflows/` — replace MD3 references with v2
- [x] Archive `docs/redesign/` into `docs/archive/redesign-ink-and-glass/`
- [x] Archive `docs/07-design/v2/style-options/` and `STYLE_C_HANDOFF.md`

#### P0-C: Integration Verification (after P0-A and P0-B merge) ✅ DONE
- [x] Fix all TypeScript errors from Tailwind removal + mode rename
- [x] Verify `npm run build` passes
- [x] Verify extension loads in Chrome
- [x] Commit checkpoint: "feat: v2 foundation — tokens, mode rename, Tailwind removal"

### Phase 1: Primitives (BLOCKING)

**Can partially parallelize. Grouped by dependency.**

#### P1-A: Shell Components (no dependencies)
- `PopupShell.tsx` — 400x600 container with `var(--paper)` background
- `TabBar.tsx` — bottom nav: Home, Library, Capture, Settings
- `ModeHeader.tsx` — mode status bar with dot + name + family

#### P1-B: List Components (no dependencies, parallel with P1-A)
- `Row.tsx` — list item with left/title/sub/right slots
- `HighlightCard.tsx` — pull-quote with quote mark, domain, optional TTL

#### P1-C: Mode Components (no dependencies, parallel with P1-A and P1-B)
- `TTLBadge.tsx` — compact inline countdown
- `TTLMeter.tsx` — 24-segment meter with HH:MM:SS
- `Button` — `.btn` / `.btn.primary` / `.btn.accent` / `.btn.ghost` / `.btn.sm`

#### P1-D: Integration (after P1-A, P1-B, P1-C merge)
- Wire primitives into a smoke test (render PopupShell with TabBar + ModeHeader)
- Verify all primitives render correctly
- Commit checkpoint: "feat: v2 primitive components"

### Phase 2: View Workstreams (PARALLEL)

**Three independent workstreams. Can be executed by separate agents simultaneously.**

#### WS-A: Core Flow (depends on Phase 1)

**Wireframe sources**: `screens-mode-select.jsx`, `screens-nav.jsx`

| Task | Wireframe Reference | Target File |
|---|---|---|
| A1: ModeSelectionView | `ModeSelect_A` in `screens-mode-select.jsx` | `src/features/modes/ModeSelectionView.tsx` |
| A2: DashboardView (Ephemeral) | `Home_Ephemeral` in `screens-nav.jsx` | `src/entrypoints/popup/views/DashboardView.tsx` |
| A3: DashboardView (Cloud) | `Home_Cloud` in `screens-nav.jsx` | Same file, conditional rendering based on mode |
| A4: Empty State — First Run | `Empty_A` in `screens-nav.jsx` | `src/ui-system/components/empty-states/FirstRunEmpty.tsx` |
| A5: Empty State — Empty Sub-domain | `Empty_B` in `screens-nav.jsx` | `src/ui-system/components/empty-states/EmptySubDomain.tsx` |
| A6: Empty State — Library Starters | `Empty_C` in `screens-nav.jsx` | `src/ui-system/components/empty-states/LibraryStarters.tsx` |
| A7: Empty State — Ephemeral Reset | `Empty_D` in `screens-nav.jsx` | `src/ui-system/components/empty-states/EphemeralReset.tsx` |

**Backend integration**: Uses `usePersistedMode` hook (already updated in P0-B), `useApp` context. Mode selection calls `setMode()` with new IDs.

**Within WS-A, tasks A1-A7 are sequential** (each builds on shared patterns from the previous).

#### WS-B: Library Flow (depends on Phase 1)

**Wireframe sources**: `screens-nav.jsx`

| Task | Wireframe Reference | Target File |
|---|---|---|
| B1: CollectionsView (Library root) | `Nav_A` level "collections" in `screens-nav.jsx` | `src/features/collections/views/CollectionsView.tsx` |
| B2: DomainDetailsView | `Nav_A` level "domain" in `screens-nav.jsx` | `src/features/collections/views/DomainDetailsView.tsx` |
| B3: SubDomainView | `SubDomainView` in `screens-nav.jsx` | `src/features/collections/views/SubDomainView.tsx` (new) |
| B4: Library Hierarchy Typography | `LibraryHierarchyInContext` in `screens-nav.jsx` | Applied within B1-B3 via CSS classes |

**Backend integration**: Uses `useCollections` hook (unchanged). Navigation uses existing `View` enum state machine in `popup/index.tsx`. Adds `SUB_DOMAIN` to the View enum.

**Within WS-B, B1 -> B2 -> B3 are sequential** (drill-down builds progressively). B4 is woven into B1-B3.

#### WS-C: Peripherals (depends on Phase 1)

**Wireframe sources**: `screens-nav.jsx`, plus existing page mockups in `docs/07-design/v2/pages/`

| Task | Wireframe Reference | Target File |
|---|---|---|
| C1: SettingsPage | `Settings` in `screens-nav.jsx` | `src/pages/SettingsPage.tsx` |
| C2: WelcomePage | `docs/07-design/v2/pages/welcome.html` | `src/pages/WelcomePage.tsx` |
| C3: PrivacyPage | `docs/07-design/v2/pages/privacy.html` | `src/pages/PrivacyPage.tsx` |
| C4: NotFoundPage | `docs/07-design/v2/pages/404.html` | `src/pages/NotFoundPage.tsx` |
| C5: AuthView | `docs/07-design/v2/pages/sign-in.html` | `src/entrypoints/popup/views/AuthView.tsx` |

**Backend integration**: SettingsPage uses `usePersistedMode`, `useCurrentUser`. AuthView uses existing Google OAuth flow (unchanged). WelcomePage uses `onStartClick` callback (unchanged).

**Within WS-C, all tasks are independent** — C1 through C5 can be done in any order or even in parallel by sub-agents.

### Phase 3: Integration & Polish (after WS-A, WS-B, WS-C merge)

1. Wire all views into `popup/index.tsx` navigation state machine
2. Ensure TabBar correctly switches between Home/Library/Settings
3. Test full user flow: Welcome -> Mode Selection -> Dashboard -> Library -> Domain -> Sub-domain -> Settings
4. Verify all empty states render in correct contexts
5. Verify motion/transitions with Framer Motion springs
6. Final build verification
7. Commit: "feat: v2 popup redesign complete"

---

## 6. Parallelism Map

```
Timeline ->

P0-A (tokens/CSS) ------+
                         +-- P0-C (verify) --- P1-A (shell) ---+
P0-B (modes/rules) ------+                    P1-B (lists) ---+
                                               P1-C (modes) ---+
                                                                +-- P1-D (integrate)
                                                                |
                                                                +---- WS-A (core flow) ----------+
                                                                +---- WS-B (library flow) -------+-- Phase 3 (integration)
                                                                +---- WS-C (peripherals) --------+
```

**Maximum parallelism points:**
- Phase 0: 2 agents (P0-A + P0-B)
- Phase 1: 3 agents (P1-A + P1-B + P1-C)
- Phase 2: 3 agents (WS-A + WS-B + WS-C)
- Within WS-C: up to 5 sub-agents (C1-C5 are independent)

---

## 7. Agent Rules (New V2)

These replace the MD3 rules in `GEMINI.md` and `CLAUDE.md`:

### Hard Rules — Never Violate
1. **Never** use hardcoded hex colors in `.tsx` files — use `var(--paper)`, `var(--ink)`, `var(--accent)`, etc.
2. **Never** use Tailwind utility classes — Tailwind is removed from the project
3. **Never** use MD3 tokens (`--md-sys-color-*`, `bg-primary`, `shadow-elevation-*`)
4. **Never** use Inter, Roboto, or system-ui as a display font — use `var(--serif)` for display
5. **Never** set `width: 400px` or `height: 600px` inside a view component — PopupShell's job
6. **Never** call `chrome.runtime` in a view — use hooks with guards
7. **Never** add dark mode styles — light-only for v1
8. **Always** use semantic typography classes: `.u-serif`, `.u-mono`, `.u-kicker`, `.u-caps`
9. **Always** use `var(--rule)` or `var(--rule-soft)` for borders
10. **Always** ensure 44px minimum touch targets
11. **Always** reference wireframe JSX as the implementation spec
12. **Always** verify with `npm run build` after each task

### Design System Source of Truth
- **Tokens**: `src/ui-system/theme/global.css`
- **Wireframe reference**: `ui_kits/extension/v2/`
- **Motion presets**: `src/ui-system/motion/springs.ts`

---

## 8. Verification Protocol

For each component or view:

1. **Read** the wireframe JSX source (file and function name specified in task)
2. **Translate** structure and styles 1:1 into React + TypeScript + v2 CSS
3. **Build**: `npm run build` — must pass with zero errors
4. **Lint**: `npx eslint <file> --max-warnings 0`
5. **Type check**: `npx tsc --noEmit`
6. **Visual verify**: Load extension in Chrome, open popup, compare to wireframe
7. **Token check**: `grep -n '#[0-9a-fA-F]' <file>` — should return zero results (no hardcoded colors)

---

## 9. Files NOT Modified

The following backend files are **not touched** by this redesign (beyond the mode rename in Phase 0):

- `src/background/` — all services, repositories, sync, auth (unchanged)
- `src/content/` — content script, highlight manager, selection detector (unchanged)
- `src/core/` — context providers (minor: mode type updates only)
- `src/shared/` — repositories, services, utils (unchanged)
- `src/services/` — vault mode service factory (renamed mode IDs only)
- `tests/` — existing tests (may need mode ID updates)

---

## 10. Out of Scope (Future Workstreams)

| Workstream | What | When |
|---|---|---|
| WS-D | Content-script capture overlay (Tooltip variant A) | After popup redesign |
| WS-E | Web app reskin with v2 tokens | After popup redesign |
| WS-F | Dark mode for editorial aesthetic | After light mode ships |
| WS-G | User-selectable typography presets | If user demand exists |
| WS-H | Storybook stories for v2 components | After design stabilizes |
