---
name: Design Tokens Reference
description: V2 Editorial token lookup table for all styling decisions in the _underscore project. Before choosing any style, check this table first.
---

# V2 Design Tokens Reference

This file is the single source of truth for atomic styling decisions in the V2 Editorial design system. Source: `ui_kits/extension/v2/tokens.css` and `src/ui-system/theme/global.css`. Never guess; look it up here.

---

## 1. The Decision Lookup Table

For every styling situation, use exactly these tokens.

### Color Decisions

| Situation | Token |
|-----------|-------|
| View background | `var(--paper)` |
| Card / container | `var(--paper-2)` |
| Elevated surface (modal/tooltip) | `var(--utility-surface-elevated)` = `#fff` |
| Primary text | `var(--ink)` |
| Secondary text | `var(--ink-2)` |
| Muted / tertiary text | `var(--ink-3)` |
| Placeholder / disabled text | `var(--ink-4)` |
| CTA / accent button background | `var(--accent)` |
| Text on accent background | `var(--accent-ink)` |
| Soft accent tint (8%) | `var(--accent-tint-08)` |
| Standard border | `var(--rule)` |
| Subtle border / card edge | `var(--rule-soft)` |
| Overlay / scrim | `var(--utility-overlay-65)` |
| Light overlay (hover state) | `var(--utility-overlay-08)` |

### Typography Decisions

| Situation | Token | Approx size |
|-----------|-------|-----------|
| Hero heading | `var(--step-4)` + `u-serif` class | 28px |
| Section heading | `var(--step-3)` | 22px |
| Card title | `var(--step-2)` | 18px |
| Comfortable body | `var(--step-1)` | 15px |
| Default body / UI text | `var(--step-0)` | 13px |
| Caption / metadata | `var(--step--1)` | 11px |
| Tiny annotation | `var(--step--2)` | 10px |
| Section label | `var(--step--1)` + `u-kicker` class | mono caps |

**Font families**: `var(--serif)` (Instrument Serif — display only), `var(--sans)` (body), `var(--mono)` (code/kickers).

### Semantic Typography Classes

| Class | Style | When to use |
|-------|-------|-----------|
| `.u-serif` | Instrument Serif italic | Display headings ONLY |
| `.u-kicker` | Mono, uppercase, letter-spaced | Section labels ("HIGHLIGHTS", "COLLECTIONS") |
| `.u-mono` | Monospace | Code, tab labels, metadata |
| `.u-caps` | Uppercase, letter-spaced | Small caps labels |

### Spacing Decisions

| Situation | Value |
|-----------|-------|
| Inner padding of a card | `12px 16px` |
| Inner padding compact | `8px 12px` |
| Inner padding dialog | `24px` |
| Gap between list items | `8px` (`gap: 8px`) |
| Gap between card rows | `12px` |
| Gap between sections | `24px` |
| Horizontal padding on view | `16px` |
| Icon button touch target | `44px × 44px` (min) |
| Standard button height | `44px` (min) — V2 spec rule 7 |
| Dense icon size | `20px × 20px` |
| Standard icon size | `24px × 24px` |

### Shape Decisions

| Token | Value | Notes |
|-------|-------|-------|
| `var(--radius)` | `2px` | The ONLY radius in V2 Editorial |

> V2 uses a single 2px radius for all elements. No `--radius-sm`, `--radius-lg`, `--radius-full`.

### Border vs Shadow

V2 Editorial uses **borders, not box-shadows** for elevation.

| Legacy (banned) | V2 replacement |
|-----------------|---------------|
| `shadow-elevation-1` | `border: 1px solid var(--rule-soft)` |
| `shadow-elevation-2` | `border: 1px solid var(--rule-soft)` |
| `shadow-elevation-3` | `border: 1px solid var(--rule)` |
| `box-shadow: var(--shadow-hover)` | `border: 1px solid var(--rule)` |

---

## 2. V2 Token Complete Reference

### Surface & Ink

| Token | Tailwind Equivalent (BANNED — use var()) |
|-------|------------------------------------------|
| `var(--paper)` | was `bg-surface` |
| `var(--paper-2)` | was `bg-surface-container-lowest` |
| `var(--ink)` | was `text-on-surface` |
| `var(--ink-2)` | was `text-on-surface-variant` |
| `var(--ink-3)` | was `text-outline` |
| `var(--ink-4)` | was `opacity-disabled` text |

### Accent Family

| Token | Usage |
|-------|-------|
| `var(--accent)` | Terracotta `oklch(62% 0.12 45)` — CTAs, mode glyphs |
| `var(--accent-2)` | Accent surface / hover |
| `var(--accent-ink)` | Text on accent background |
| `var(--accent-tint-08)` | 8% accent tint |
| `var(--accent-tint-18)` | 18% accent tint |
| `var(--accent-tint-35)` | 35% accent tint |
| `var(--accent-tint-65)` | 65% accent tint |

### Utility Overlays

| Token | Usage |
|-------|-------|
| `var(--utility-overlay-05)` | 5% black |
| `var(--utility-overlay-08)` | 8% black (hover) |
| `var(--utility-overlay-18)` | 18% black (pressed) |
| `var(--utility-overlay-35)` | 35% black |
| `var(--utility-overlay-65)` | 65% black (scrim) |
| `var(--utility-overlay-88)` | 88% black (heavy scrim) |
| `var(--paper-overlay-08)` | 8% white (glass) |
| `var(--paper-overlay-90)` | 90% paper (glass bg) |

---

## 3. Anti-Patterns Checklist

Before submitting any UI code, verify none of these are present:

```bash
# Legacy MD3/Ink/Style C vars (MUST BE ZERO)
grep -rn "var(--md-sys-\|var(--ink-[0-9]\|var(--bg\|var(--text-primary\|var(--border\b\|var(--shadow-\|var(--elevation\|var(--logo-" src/ --include='*.tsx'

# Hardcoded hex colors (MUST BE ZERO)
grep -rn '#[0-9a-fA-F]\{3,8\}\b' src/ --include='*.tsx'

# Arbitrary Tailwind duration classes (MUST BE ZERO)
grep -rn 'duration-\[[0-9]*ms\]' src/ --include='*.tsx'

# Arbitrary rounded classes (MUST BE ZERO)
grep -rn 'rounded-\[[0-9]*px\]' src/ --include='*.tsx'
```

All should return zero hits.
