# DESIGN.md — _underscore

> Source of truth for Open Design import + V2 Editorial implementation.
> Code truth: `src/ui-system/theme/global.css` + `src/ui-system/components/primitives/`

## 1. Subject

**Concrete subject:** researcher's desk — highlighter pen, paper slip, archive box.
**Audience:** heavy web readers, researchers, students who save passages.
**Single job:** capture a passage in <2s, find it again later without friction.

Every choice below comes from marginalia vernacular: marked passages, source stamps, filed slips. Not a generic SaaS dashboard.

## 2. Design plan critique (per frontend-design skill)

Initial instinct was the generic default #1: warm cream `#F4F1EA` + high-contrast serif + terracotta accent, broadsheet hairline rules.

That matches current V2 tokens (`--paper: #f7f5f0`, `--accent: #c96442`-ish, `--serif`), so the brief wins on foundation — we keep paper/ink/accent continuity.

**What changed and why to avoid template feel:**

1. Accent is demoted from decoration to evidence. Terracotta appears only as active state, brand mark, and highlighter wash. Modes are glyph + label, never color. Changed because generic designs spray accent on every CTA.
2. Mono is promoted to co-equal voice (source URL, timecode, TTL, sync state), not caption afterthought. Changed because highlight apps live or die on provenance.
3. Signature is `highlight-wash + provenance rail`, not big serif hero + stats + gradient. Changed because hero-numbers-with-gradient is the template answer; our most characteristic thing is a marked passage itself.

## 3. Tokens

### Color — 6 named, paper-first

| Name | Hex | Token | Use |
|------|-----|-------|-----|
| Paper | `#F7F5F0` | `--paper` | app bg, popup 400x600 |
| Deep Paper | `#EFECE4` | `--paper-2` | sunken wells, list bg |
| Ink | `#111110` | `--ink` | text, heavy rule |
| Soft Rule | `#CFC9BD` | `--rule-soft` | hairlines |
| Marker Terracotta | `#C96442` | `--accent` (`oklch(62% 0.12 45)`) | single accent, active only |
| Archive Moss | `#2C7A4B` | `--ttl-fresh` / `--synced` | fresh/synced only |

Supporting: `--ink-2: #3A3835`, `--ink-3: #6B6760`, `--ink-4: #A39E94`. Tints via `color-mix`: `--accent-tint-08/18/35/65`. Overlays `--utility-overlay-06..25`. Dark flip: `--paper: #141312`, `--ink: #F5F1E8`, accent lifts to `oklch(70% 0.13 45)`.

Exceptions (never tokenize): `#FEF4A8` sticky-note yellow, `#34C759` iOS toggle on (`--utility-ok`), TTL amber `#B8731A` / expired `#8A2A1A`.

### Type — 3 roles

* **Display:** `GT Alpina, Source Serif 4, Iowan Old Style, Georgia, serif` (`--serif`). Titles only: `popup-page-title` 22px/500/-0.02em/1.15. Restrained, never for body.
* **Body/UI:** `Söhne, Inter, Helvetica Neue, Arial, sans` (`--sans`). 13px base, 1.45 line-height, -0.005em.
* **Provenance/Data:** `JetBrains Mono, IBM Plex Mono, SFMono, ui-monospace` (`--mono`). Source stamps, TTL countdown, meta `u-mono`, `u-caps` 10px/0.12em uppercase.

Scale: `--step--2:10, --1:11, -0:13, -1:15, -2:18, -3:22, -4:28, -5:36, -6:48`. Display tracking `-0.025em`, section tracking `0.16em`. Min row height 44px (`--type-row-height`, `--control-h`).

### Layout

Popup chrome owned solely by `PopupShell` (400x600, `display:flex column`). Views are body-only, no chrome imports, no per-view `AnimatePresence`, no `width:400px` inside views.

```
+------------------ 400x600 ---------------+
| title strip (outside)                    |
| ModeHeader [glyph+label basic/pro/pro_xai]|
|------------------------------------------|
| BODY                                     |
|  serif title 22px                        |
|  [highlight-wash card | provenance rail] |
|  44px rows, rule-soft dividers           |
|                                          |
| TabBar: Home / Library / Settings        |
+------------------------------------------+
```

Web: centered `44rem` article column (`public-legal__article`), 16px gutters. Density is a global Tweak, never per-screen.

Geometry: `--radius: 2px` sharp slip-like. Ask bubble is the sole softness: `--ask-bubble-r:4px`. Controls 32/36/44px, icon 16px, hit 36px.

### Signature — highlight-wash + provenance rail

One memorable thing: a saved highlight renders as a paper slip with:

1. translucent marker wash behind quoted text (`--accent-tint-18`, TTL wash `rgba(184,115,26,0.12)` when expiring),
2. 2px left provenance rail in `--rule` (not accent),
3. mono source stamp below: `domain · hh:mm · sync-state`.

No gradients, no numbered `01/02/03` markers (content is not a sequence), no stat hero. Boldness is spent here; everything else stays quiet.

## 4. Components (map to `primitives/`)

* `HighlightCard`: wash + rail + stamp. Hover: `paper-3` fill.
* `Row`: 44px min, `ink-3` meta right, press `utility-overlay-08`.
* `Button`: primary = ink fill on paper / paper fill on dark; accent only for active brand moments. Secondary = 1px `rule` outline.
* `Chip / TagPill / ModePill / PlanPill`: glyph + label, single accent family, never per-mode hue.
* `Input / Dialog / DropdownMenu / SegmentedControl`: 2px radius, `rule-soft` borders, focus ring visible.
* `Skeleton / Spinner / TrustSignal`: quiet, no shimmer gradients.

## 5. Motion

Single orchestrated moment: capture confirm — marker wash wipes left-to-right 240ms `cubic-bezier(0.23,1,0.32,1)`. Everything else: `dur-fast:120ms` hover, no scroll reveals, no ambient loops. `prefers-reduced-motion` disables wipe. Production code owns motion; wireframes declare none.

## 6. Voice (UI copy)

End-user side, active, sentence case, one job per element.

* Controls say what happens: `Save highlight`, not `Submit`. Button `Publish` → toast `Published`.
* Empty Library is invitation: `Highlight any passage to start your archive.` + `How to highlight` action.
* Errors give direction, never apologize vaguely: `Sync failed — 3 highlights waiting. Retry.` not `Something went wrong`.
* Never expose system terms: `Library`, not `event store`; `Sign in to sync`, not `JWT invalid`.

## 7. Constraints (non-negotiable)

* CSS vars only: `var(--paper)`, `var(--ink)`, `var(--accent)`, `var(--rule)`. No hex in `.tsx`, no Tailwind, no `bg-primary`, no `--md-sys-color-*`, no `Ink & Glass` tokens, no Style C aliases.
* Typography classes: `.u-serif`, `.u-mono`, `.u-caps`; sizes via `--step-*`.
* Repos: Supabase via repository pattern only. Event sourcing append-only.
* A11y floor: responsive to 320px, visible keyboard focus, AA labels (`ink-3` min), reduced-motion respected.

## 8. Open Design import notes

* Paste this file into `Paste DESIGN.md`.
* Link local code: `src/ui-system/theme/global.css` + `src/ui-system/components/primitives/`.
* Describe brand: `_underscore, intelligent web highlighter, editorial paper archive, terracotta marker, mono provenance`.
