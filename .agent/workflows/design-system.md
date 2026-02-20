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
_To be defined after visual direction approval._

### Typography
- **Font**: Inter (already loaded)
- **Scale**: Start from base 14px, use a limited set of sizes
- Prefer `font-light` (300) for display text, `font-medium` (500) for labels

### Spacing
- Base unit: 8px
- Use 4, 8, 12, 16, 24, 32, 48, 64 as the spacing ramp

### Shadows
- Ultra-soft: `0 1px 3px rgba(0,0,0,0.04)` for resting
- Hover: `0 4px 16px rgba(0,0,0,0.06)` for elevated state
- No heavy MD3-style shadows

### Radii
- Small containers (chips, badges): 6px
- Cards, inputs: 10px
- Modals, sheets: 16px
- Pill buttons: 9999px

### Interaction
- Hover: subtle background shift (not opacity change)
- Press: scale(0.97) + darker bg
- Focus: 2px ring in accent color
- Transitions: 150ms ease-out (quick, not bouncy)

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
- Active/available modes are full opacity, clickable
- Locked modes are 40% opacity with lock indicator
- Header: logo left, avatar/sign-in right
- Footer: subtle "sign in to unlock" prompt for unauthenticated

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
