---
description: Visual DNA reference for _underscore app - defines the complete design language for consistent mockup generation and UI implementation
---

# _underscore Design System

> This is the **visual DNA** of the app. Every mockup, component, and page must follow these specifications. 
> Non-negotiable: consistency across all screens.

---

## App Context

**What**: Browser extension for organizing web browsing into modes (Focus, Capture, Memory, Neural)
**Who**: Knowledge workers, researchers, power users
**Where**: 400px-wide popup + full-page views opened from extension
**Tone**: Calm, intelligent, minimal — like a well-designed tool that gets out of your way

---

## Sitemap & Flows

```
Pages (8):
├── /           Welcome (unauthenticated landing)
├── /sign-in    Sign In (Google OAuth)
├── /mode       Mode Selection (heart of the app)
├── /collections   Collections List (saved items by domain)
├── /domain/:id    Domain Details Dashboard
├── /settings      Settings
├── /privacy       Privacy
└── /*             404

Overlays:
├── Account Menu (dropdown from user avatar)
└── Sign Out Confirmation
```

### User Flows
```
Flow 1 - First Time:    Welcome → Sign In → Mode Selection
Flow 2 - Returning:     Mode Selection → [browse] → Collections → Domain Details
Flow 3 - Account:       Avatar → Account Menu → Settings / Privacy / Sign Out
```

---

## Visual Direction

### Core Principles
1. **Breathing room** — generous whitespace, never cramped
2. **One focal point per screen** — don't compete for attention
3. **Progressive disclosure** — show less, reveal on demand
4. **Motion = meaning** — animate only to communicate, not decorate

### Color Palette

Use the MD3 roles defined in `src/ui-system/theme/global.css`. In specs, reviews, and implementation notes, reference token names and Tailwind utilities, not raw light/dark literals. The tone should stay calm, intelligent, and minimal regardless of theme.

| Role | MD3 token | Tailwind utility | Usage |
|------|-----------|------------------|-------|
| Background | `--md-sys-color-surface` | `bg-surface` | Page canvas and full-screen roots |
| Surface (card) | `--md-sys-color-surface-container-lowest` | `bg-surface-container-lowest` | Cards, containers, list rows |
| Elevated surface | `--md-sys-color-surface-container-low` | `bg-surface-container-low` | Slightly raised shells and sticky regions |
| Text primary | `--md-sys-color-on-surface` | `text-on-surface` | Headings and body copy |
| Text secondary | `--md-sys-color-on-surface-variant` | `text-on-surface-variant` | Descriptions, labels, helper text |
| Text tertiary | `--md-sys-color-outline` | `text-outline` | Metadata, timestamps, quiet UI |
| Accent fill | `--md-sys-color-primary` | `bg-primary` | CTAs and active states |
| Accent text | `--md-sys-color-primary` | `text-primary` | Text-only emphasis and inline actions |
| Accent container | `--md-sys-color-primary-container` + `--md-sys-color-on-primary-container` | `bg-primary-container text-on-primary-container` | Tonal pills, selected filters, highlighted summaries |
| Border | `--md-sys-color-outline-variant` | `border-outline-variant` | Default card, field, and divider borders |
| Border hover | `--md-sys-color-outline` | `border-outline` | Hover/focus emphasis and stronger separation |

**Logo (theme-adaptive)**:
- Use `--logo-bg`, `--logo-text`, `--logo-text-shadow`, and `--logo-ambient-reflection` for the underscore mark.
- Treat the logo variables as a deliberate exception to the MD3 palette. Preserve their theme-adaptive contrast and do not remap the mark to generic `primary` or `on-primary` roles.

### Typography
- **Font**: Inter (already loaded)
- **Scale**: Start from base 14px, use a limited set of sizes
- Prefer `font-light` (300) for display text, `font-medium` (500) for labels

### Spacing
- Base unit: 8px
- Use 4, 8, 12, 16, 24, 32, 48, 64 as the spacing ramp

### Shadows
- Rest: `0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)`
- Hover: `0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)`
- Active: `0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)`
- Ultra-soft — no heavy MD3-style elevation shadows

### Radii
- Cards, inputs: `12px` (`--radius`)
- Pill buttons, badges: `9999px` (`--radius-full`)

### Interaction
- Hover: card elevates `translateY(-2px)` + shadow bloom + accent arrow slides in
- Press: `translateY(0) scale(0.98)` + shadow compresses
- Focus: 2px ring in accent color
- Glass reflections: `::before` pseudo-element with top linear-gradient on logo and cards
- Transitions: `0.2s ease-out`
- Locked modes: `opacity: 0.6`, 🔒 icon, `pointer-events: none`
- Segmented controls and filter pills: use dark-safe tonal capsules with muted surface shells and `primary-container` active state, never bright white/default button fills in dark mode

---

## Page Specifications

### 1. Welcome Page (`/`)
- Full-screen centered layout
- Logo + app name large and centered
- "Get Started" CTA (primary button)
- One-liner tagline below logo
- Background: subtle gradient or flat

### 2. Sign In (`/sign-in`)
- Centered card layout
- Google sign-in button (standard look)
- Minimal text — just "Continue with Google"
- Back link to welcome

### 3. Mode Selection (`/mode`)
- This IS the app's home screen
- Large, vertical list of modes (Focus, Capture, Memory, Neural)
- Active/available modes are full opacity, clickable with hover elevation
- Locked modes are 60% opacity with 🔒 lock indicator
- Header: centered logo + app name
- Footer: subtle "Unlock more →" prompt for unauthenticated

### 4. Collections (`/collections`)
- List of collections grouped by domain
- Each collection card: favicon, domain name, item count, last updated
- Empty state: illustrated prompt to start saving
- Search/filter at top

### 5. Domain Details (`/domain/:id`)
- Header: domain name, favicon, stats (item count, date range)
- List of saved items (chronological)
- Each item: title, URL snippet, timestamp
- Theme switcher (light/dark/sepia) for reading

### 6. Settings (`/settings`)
- Clean form layout
- Grouped sections with subtle dividers
- Toggle switches for preferences
- Account info section

### 7. Privacy (`/privacy`)
- Static content page
- Clean typography, good reading flow
- Back navigation

### 8. 404
- Centered "not found" message
- Link back to home
- Minimal, friendly

---

## Component Inventory

### Primitives Needed
- Button (filled, outlined, text, icon-only)
- Card (static, interactive)
- Input (text field, search)
- Chip (filter, selected state)
- Segmented control / tonal pill group
- Text (semantic typography component)
- Dialog / Modal
- Separator / Divider
- Spinner / Loading
- Icon wrapper
- Logo
- Toggle / Switch
- Avatar

### Composed Components
- Header / Navbar
- Account Menu (dropdown)
- Mode Card (clickable, with lock state)
- Collection Card
- Domain Item Row
- Empty State
- Settings Section

---

## Mockup Generation Checklist

For each page mockup, verify:
- [ ] Follows the spacing ramp (8px base)
- [ ] Typography uses only Inter at defined weights
- [ ] Colors come from the approved palette
- [ ] Interactive elements show hover/active states
- [ ] Dark mode variant designed
- [ ] Touch targets ≥ 44px on mobile, ≥ 48px on desktop
- [ ] Consistent with all other pages in the set
