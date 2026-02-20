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

**Seed color**: `#5b8db9` (Underscore Blue) — used to generate the full MD3 palette.

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| Background | `#fafbfc` | `#0e1015` | Page canvas |
| Surface (card) | `#ffffff` | `rgba(255,255,255,0.04)` | Cards, containers |
| Text primary | `#0f1419` | `#e4e7ec` | Headings, body |
| Text secondary | `#536471` | `#8b95a5` | Descriptions, labels |
| Text tertiary | `#8b98a5` | `#4b5563` | Placeholders, hints |
| Accent | `#5b8db9` | `#6da3cc` | CTAs, active states |
| Accent text | `#4a7da8` | `#93bbda` | Hover text on interactive |
| Border | `#eef1f3` | `rgba(255,255,255,0.06)` | Card/container borders |
| Border hover | `#dfe3e8` | `rgba(255,255,255,0.10)` | Hover state borders |

**Logo (theme-adaptive)**:
- Light mode: Dark charcoal circle (`#1a1d23`), white `_`
- Dark mode: Pearl white circle (`#f8f9fa`), black `_` (`#111827`)

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
