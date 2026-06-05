---
description: V2 Editorial design tokens reference for _underscore. Single source of truth for all token lookup. Replaces the legacy md3-tokens-reference.md.
---

# V2 Tokens Reference

The V2 Editorial design system uses a pure CSS custom properties approach. Source of truth: `ui_kits/extension/v2/tokens.css` and `src/ui-system/theme/global.css`.

---

## Surface & Ink (Core Color Palette)

| Token | Usage |
|-------|-------|
| `var(--paper)` | Primary background — warm off-white |
| `var(--paper-2)` | Card / container background — slightly warmer |
| `var(--ink)` | Primary text — near-black |
| `var(--ink-2)` | Secondary text — medium grey |
| `var(--ink-3)` | Tertiary / muted text — light grey |
| `var(--ink-4)` | Placeholder, disabled text — very light |
| `var(--utility-surface-elevated)` | `#fff` — truly elevated surface (modals, tooltips) |

## Borders

| Token | Usage |
|-------|-------|
| `var(--rule)` | Standard border — visible divider |
| `var(--rule-soft)` | Subtle border — card edges, list separators |

> **V2 uses borders, not box-shadow.** Replace all `shadow-elevation-*` with `border: 1px solid var(--rule-soft)`.

## Accent (Terracotta)

| Token | Usage |
|-------|-------|
| `var(--accent)` | `oklch(62% 0.12 45)` — all mode glyphs + CTAs |
| `var(--accent-2)` | Accent surface / hover state |
| `var(--accent-ink)` | Text color on `--accent` background |
| `var(--accent-tint-08)` | 8% accent tint — subtle accent bg |
| `var(--accent-tint-18)` | 18% accent tint |
| `var(--accent-tint-35)` | 35% accent tint |
| `var(--accent-tint-65)` | 65% accent tint |

> **All modes share `--accent`**. Modes are distinguished by glyph + label, not color.

## Utility Overlays

| Token | Usage |
|-------|-------|
| `var(--utility-overlay-05)` | 5% black overlay |
| `var(--utility-overlay-08)` | 8% black overlay |
| `var(--utility-overlay-18)` | 18% black overlay |
| `var(--utility-overlay-35)` | 35% black overlay |
| `var(--utility-overlay-65)` | 65% black overlay |
| `var(--utility-overlay-88)` | 88% black overlay — heavy scrim |
| `var(--paper-overlay-08)` | 8% white/paper overlay |
| `var(--paper-overlay-18)` | 18% white/paper overlay |
| `var(--paper-overlay-35)` | 35% white/paper overlay |
| `var(--paper-overlay-90)` | 90% paper overlay — glass bg |

## Typography

### Font Families

| Token | Usage |
|-------|-------|
| `var(--serif)` | Instrument Serif — display headings ONLY |
| `var(--sans)` | System sans-serif — body text, UI labels |
| `var(--mono)` | Monospace — code, tab labels, kickers |

### Type Scale (fluid)

| Token | Approx size | Usage |
|-------|------------|-------|
| `var(--step--2)` | 10px | Tiny annotation |
| `var(--step--1)` | 11px | Caption, timestamp, kicker |
| `var(--step-0)` | 13px | Default body, UI text |
| `var(--step-1)` | 15px | Comfortable body |
| `var(--step-2)` | 18px | Card title, small heading |
| `var(--step-3)` | 22px | Section heading |
| `var(--step-4)` | 28px | Display heading |
| `var(--step-5)` | 36px | Large display |
| `var(--step-6)` | 48px | Hero display |

### Semantic Typography Classes

| Class | Applies | When to use |
|-------|---------|-------------|
| `.u-serif` | `font-family: var(--serif); font-style: italic` | Display headings only |
| `.u-mono` | `font-family: var(--mono)` | Code, tab labels |
| `.u-kicker` | `font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.1em` | Section labels |
| `.u-caps` | `text-transform: uppercase; letter-spacing: 0.05em` | Small caps labels |

## Geometry

| Token | Value | Usage |
|-------|-------|-------|
| `var(--radius)` | 2px | Single editorial radius — all corners |
| `var(--pop-w)` | 400px | Popup width |
| `var(--pop-h)` | 600px | Popup height |

> **V2 has one radius: 2px.** No `--radius-sm`, `--radius-lg`, `--radius-full`.

## Mode Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `var(--mode-ephemeral)` | `var(--accent)` | Ephemeral mode glyph |
| `var(--mode-local)` | `var(--accent)` | Local mode glyph |
| `var(--mode-cloud)` | `var(--accent)` | Cloud mode glyph |
| `var(--mode-ai)` | `var(--accent)` | AI mode glyph |

All four mode tokens resolve to `--accent` — modes are distinguished by glyph and label only.

---

## Decision Lookup Table

### Color Decisions

| Situation | Token |
|-----------|-------|
| View background | `var(--paper)` |
| Card / container | `var(--paper-2)` |
| Primary text | `var(--ink)` |
| Secondary text | `var(--ink-2)` |
| Muted / tertiary text | `var(--ink-3)` |
| CTA / accent button bg | `var(--accent)` |
| Text on accent | `var(--accent-ink)` |
| Border / divider | `var(--rule-soft)` |
| Prominent border | `var(--rule)` |
| Overlay / scrim | `var(--utility-overlay-65)` |

### Typography Decisions

| Situation | Token + Class |
|-----------|--------------|
| Hero heading | `var(--step-4)` + `u-serif` |
| Section heading | `var(--step-3)` |
| Card title | `var(--step-2)` |
| Body / UI label | `var(--step-0)` |
| Caption / metadata | `var(--step--1)` |
| Section label | `var(--step--1)` + `u-kicker` |

### Touch Target

- **Minimum**: 44px (`minHeight: '44px'`)
- Per V2 spec rule 7 — applies to all interactive elements in popup and web

---

## Anti-Patterns (All Banned)

```
BANNED — Legacy systems (will cause ESLint error):
var(--md-sys-color-*)     → var(--paper), var(--ink), var(--accent)
var(--ink-1..4)           → var(--paper-2), var(--ink)
var(--ink-focus)          → var(--accent)
var(--ink-neural)         → var(--accent)
var(--bg)                 → var(--paper)
var(--text-primary)       → var(--ink)
var(--border)             → var(--rule)
var(--shadow-hover)       → border: 1px solid var(--rule-soft)
var(--elevation-*)        → border: 1px solid var(--rule-soft)
shadow-elevation-1..5     → border: 1px solid var(--rule-soft)
bg-primary                → background: var(--accent)
text-on-surface           → color: var(--ink)
rounded-[Xpx]             → border-radius: var(--radius)
duration-[XXXms]          → use CSS transition shorthand
```
