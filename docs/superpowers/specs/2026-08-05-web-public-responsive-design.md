# Design: Web Public Pages Responsive Layout

**Status:** Approved  
**Date:** 2026-08-05  
**Branch context:** Follow-on to Web App OD Parity (`feature/web-app-od-parity`)  
**Related:** Welcome currently popup-scale on desktop (`maxWidth: 360`, fixed step type, absolute footer)

---

## Problem

On desktop, the web Welcome page (`/`) renders as a small, popup-era island: content capped near 360px, popup type steps, and vertical centering that does not use a true viewport canvas. The result feels unscaled and sparse. Public auth/legal pages share the same risk.

Product shell (Home / Library / Ask / Settings) is **out of scope** for this design.

## Goals

1. Welcome and other **public** web routes feel intentional at desktop widths.
2. Layout and type **adapt continuously** from narrow phone to ultrawide (fluid + breakpoints).
3. **Extension popup** Welcome remains compact and unbroken.
4. Stay on **V2 Editorial** tokens (no Tailwind, no hex in TSX).
5. Prefer CSS over JS resize logic.

## Non-goals

- Product shell responsive overhaul
- Full marketing redesign (hero art, multi-column campaigns)
- Changing Polar/auth business logic
- Inventing a second type system beyond Editorial tokens + fluid clamp

## Approach

**Dual layout path (web vs popup)** for Welcome:

| Path | Detection | Behavior |
|------|-----------|----------|
| **Web** | No `onStartClick` (SPA router) | `welcome--web`: `100dvh` canvas, fluid type, wider measure, in-flow footer |
| **Popup** | `onStartClick` provided | `welcome--popup`: keep compact layout |

Auth and legal use the same **public canvas** pattern on web.

## Layout rules (web public)

### Canvas

- Root: `min-height: 100dvh` (fallback `100vh`), full width, column flex
- Background: paper + subtle radial wash (tokenized)
- Safe padding: `clamp(1.5rem, 4vw, 4rem)`

### Welcome content

- Centered column
- Content width: `min(100%, 28rem)`; at `min-width: 1024px` up to **36rem** for title block; lede ~28–32ch
- Footer **in-flow** (not absolute) on web
- Stack: logo → wordmark → lede → CTA → trust → footer

### Type (web only)

| Role | Guidance |
|------|----------|
| Wordmark | `clamp(2rem, 4vw + 1rem, 3.5rem)` |
| Lede | `clamp(0.9375rem, 1.2vw + 0.7rem, 1.125rem)` |
| Trust / footer | mono; slightly larger on `min-width: 768px` if needed |
| CTA | min height 44px |

Popup keeps current `var(--step-*)` sizes.

### Breakpoints

| Range | Behavior |
|-------|----------|
| &lt; 480px | Compact padding; trust may wrap |
| 480–1023px | Comfortable center; ~28rem |
| ≥ 1024px | Larger display type; more air |
| ≥ 1440px | Cap clamp maxima |

### Auth / Privacy / Terms

- Auth: public canvas, form column ~24–28rem
- Privacy/Terms: prose ~65ch, padded canvas

## Files

| Path | Responsibility |
|------|----------------|
| `src/pages/WelcomePage.tsx` | Dual class roots; semantic structure |
| `src/web/theme/public-pages.css` | Web public fluid rules |
| `src/main-web.tsx` | Import public CSS |
| Auth + Privacy + Terms | Public canvas as needed |
| Tests | web vs popup class selection |

## Acceptance

1. ≥1280px Welcome is balanced (not a postage stamp).
2. Resize 360→1920: no horizontal overflow; footer does not cover CTA.
3. Extension popup Welcome still fits 400×600.
4. Light/dark tokens work; Editorial only.
5. Product routes unchanged.

## Implementation order

1. `public-pages.css` + import  
2. Welcome dual-path  
3. Auth public canvas  
4. Privacy / Terms  
5. Light tests + manual check  
