# Auth Landing Redesign (Web + Popup)

**Status:** Approved (grill lock + After mock)  
**Date:** 2026-07-14  
**Surfaces:** Web SPA `SignInView`, extension popup `AuthView`  
**Canvas:** `~/.cursor/projects/.../canvases/auth-landing-redesign.canvas.tsx`

## Problem

Production sign-in/sign-up looks unfinished: double brand, left marginalia rail on landing, heavy field strokes (`--rule`), ghost `Button` boxes for secondary actions, and **Back** hard-wired to `/mode` instead of the previous page.

OTP / forgot / reset flows already use `AuthScreenShell` (rail + kickers). This redesign is **landing only**.

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Stay on **V2 Editorial** tokens | Consistency with locked design system |
| 2 | Centered ~400px column; **no rail / no job kicker on landing** | Rail reserved for OTP/reset |
| 3 | **Back:** `history.back()` if same-origin prior entry; else `returnTo` or `/settings` | Matches “last previous page”; settings is the default home-from-auth |
| 4 | **Web + popup** same voice; popup denser | Avoid dual design languages |
| 5 | Secondary actions = **text links** only | Only Google (accent) + primary (ink) are real CTAs |
| 6 | **Brand in chrome only** | PopupShell / web strip; body starts at Back + title |
| 7 | Shared `Input` default border → **`--rule-soft`** | Soften fields product-wide; focus/error stay `--accent` |
| 8 | Title + subtitle **centered**; Back top-left | Locked in final mock review |

## Layout (After)

```
[chrome: mark + underscore | SIGN IN | Create account | Welcome back]
Back                                              (text, top-left)
        Create your account / Welcome back          (serif, center)
        subtitle                                    (center)
──────── divider ────────
[Continue with Google]                              (accent)
── or email ──
EMAIL / PASSWORD fields                             (soft border)
[Create account | Sign in]                          (primary ink)
Already have… Sign in                               (text links)
legal footnote
```

### Web chrome

Slim top strip on `SignInView` (web has no PopupShell):

- Left: logo mark + “underscore”
- Center-right: page label `SIGN IN`
- Right: mode status `Create account` | `Welcome back`

### Popup chrome

Unchanged ownership: `PopupShell` title (`_underscore · sign in`). Body must **not** repeat the wordmark.

## Behavior

### Back (web)

Pure helper `resolveAuthLandingBack` / `navigateAuthLandingBack`:

1. If `document.referrer` is same-origin **and** `history.length > 1` → `history.back()`
2. Else if `returnTo` query param → navigate via existing `resolveAuthRedirectTarget`
3. Else → `/mode`

### Back (popup)

Call existing `onBackToModeSelection` (view stack is not browser history). Style as top text link, not ghost button.

### Mode toggle / legal

Plain text / underline links (no `Button variant="ghost"` boxes). Mode toggle may use `type="button"` with link styling for a11y.

## Out of scope

- AuthScreenShell / OTP / forgot / reset layout (already redesigned)
- New palette or non-V2 tokens
- Changing OAuth / signup / OTP business logic

## Files

| Path | Change |
|------|--------|
| `docs/superpowers/specs/2026-07-14-auth-landing-redesign.md` | This spec |
| `src/shared/auth/navigate-auth-landing-back.ts` | History-aware back helper |
| `src/features/auth/components/AuthLandingChrome.tsx` | Web page chrome strip |
| `src/features/auth/SignInView.tsx` | After layout + back + chrome |
| `src/entrypoints/popup/views/AuthView.tsx` | After layout (no body brand/rail) |
| `src/ui-system/components/primitives/Input.tsx` | Default border `--rule-soft` |
| Tests for Input, SignInView back, AuthView structure | Update / add |

## Implementation order

1. Input border + unit tests  
2. `navigateAuthLandingBack` + unit tests  
3. `AuthLandingChrome`  
4. `SignInView` layout  
5. `AuthView` layout  
6. `npm run type-check` + targeted vitest  

## Verify

- [ ] Landing has no left rail, no body wordmark, no ACCOUNT kicker  
- [ ] Back is first body control (text)  
- [ ] Title/subtitle centered  
- [ ] Google = accent; email submit = primary  
- [ ] Mode toggle is text link, not ghost box  
- [ ] Web Back uses history when referrer same-origin  
- [ ] Popup Back still calls `onBackToModeSelection`  
- [ ] Input default border is `--rule-soft`; error/focus still `--accent`  
- [ ] Existing signup / OTP wiring tests still pass  
