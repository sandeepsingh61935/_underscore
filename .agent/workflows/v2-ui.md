---
description: How to create V2 Editorial UI components — wireframe-as-spec workflow with V2 tokens, accessibility, and visual consistency. Replaces the legacy md3-ui.md.
---

# V2 UI Workflow

Use this workflow when building any new UI component, view, or page in the _underscore project.

## Philosophy

V2 Editorial is a pure CSS custom properties system. No Tailwind utilities. No MD3 tokens. No Ink & Glass.

The **wireframe JSX** in `ui_kits/extension/v2/` is the implementation spec — match it exactly.

---

## Step 1: Read the Wireframe

Before writing any code, open the relevant wireframe in `ui_kits/extension/v2/`:

| File | Contains |
|------|----------|
| `primitives.jsx` | PopupShell, TabBar, ModeHeader, Row, HighlightCard, TTLBadge |
| `screens-nav.jsx` | Dashboard, Collections, DomainDetails, SubDomain |
| `screens-mode-select.jsx` | Mode selection view |
| `tokens.css` | All V2 CSS custom property definitions |

Read the wireframe JSX as the **exact visual spec**. Implement it — don't interpret or adapt it.

---

## Step 2: Run the Pre-Flight

Follow `.agent/workflows/ui-preflight.md` before writing any code.

Key checks:
- [ ] No MD3 / Ink & Glass / Style C tokens
- [ ] No Tailwind utilities
- [ ] No hardcoded hex colors
- [ ] Touch targets ≥ 44px
- [ ] Popup views are body-only (PopupShell owns chrome)

---

## Step 3: Implement with V2 Tokens

### Token Quick-Reference

```css
/* Background */
background: var(--paper);        /* view bg */
background: var(--paper-2);      /* card bg */

/* Text */
color: var(--ink);               /* primary text */
color: var(--ink-2);             /* secondary */
color: var(--ink-3);             /* muted */

/* Borders (no shadows in V2) */
border: 1px solid var(--rule-soft);   /* card edge */
border: 1px solid var(--rule);        /* divider */

/* Accent */
background: var(--accent);       /* CTA, mode glyph */
color: var(--accent-ink);        /* text on accent */

/* Typography */
font-family: var(--serif);       /* + font-style: italic — headings only */
font-family: var(--sans);        /* body */
font-family: var(--mono);        /* code, kickers */
font-size: var(--step-0);        /* 13px — default */
font-size: var(--step-3);        /* 22px — heading */

/* Geometry */
border-radius: var(--radius);    /* 2px — all corners */
```

### Semantic Typography Classes

```html
<!-- Display heading — Instrument Serif italic -->
<h1 class="u-serif">Your knowledge workspace</h1>

<!-- Section label — mono caps -->
<p class="u-kicker">HIGHLIGHTS</p>

<!-- Monospace data -->
<span class="u-mono">abc123</span>
```

---

## Step 4: Popup Chrome Contract

If building a **popup view**:
- Views return body content only — `display: flex, flex-direction: column, height: 100%, width: 100%`
- **Never** import or render `PopupShell`, `ModeHeader`, or `TabBar` from a view
- Chrome config lives in `src/entrypoints/popup/chrome.ts`
- `PopupShell` owns the 400×600 box, `AnimatePresence`, `ModeHeader`, and `TabBar`

If building a **web page**:
- Full viewport layout — `min-height: 100vh`
- Standard page container with max-width

---

## Step 5: Accessibility Checklist

- [ ] All interactive elements: `min-height: 44px` (V2 spec rule 7)
- [ ] Icon-only buttons: `aria-label` + `title`
- [ ] Focus rings: inherit from global — do NOT override `outline: none` without replacement
- [ ] No `onMouseEnter` / `onMouseLeave` for visual state — use CSS `:hover`
- [ ] Color pairs: `var(--paper)` + `var(--ink)`, `var(--accent)` + `var(--accent-ink)`

---

## Step 6: Verify

```bash
# No legacy tokens
grep -rn "var(--md-sys-\|var(--ink-[0-9]\|var(--bg\|var(--text-primary\|var(--border\b\|var(--shadow-" src/ --include="*.tsx"

# No hardcoded hex
grep -rn '#[0-9a-fA-F]\{3,8\}\b' src/ --include="*.tsx"

# No arbitrary Tailwind classes
grep -rn 'duration-\[[0-9]*ms\]\|rounded-\[[0-9]*px\]' src/ --include="*.tsx"

# Build green
npm run build && npm run type-check
```

---

## Step 7: Commit

One commit per file changed:

```
refactor(ui-system): migrate {ComponentName} to V2 tokens
feat(ui-system): add {ComponentName} primitive per V2 wireframe
```

No Storybook stories — Storybook is removed from this project.

---

## V2 Anti-Patterns (Reject on Code Review)

```
REJECTED:
- var(--md-sys-color-*)      → use var(--paper), var(--ink), var(--accent)
- var(--ink-neural)          → use var(--accent)
- bg-primary, text-on-surface → MD3 Tailwind classes — removed
- shadow-elevation-*         → use border: 1px solid var(--rule-soft)
- rounded-[Xpx]              → use border-radius: var(--radius)
- duration-[XXXms]           → use CSS transition
- .stories.tsx               → Storybook removed
- SocialButton               → deleted in Layer 3
- Inter font declaration      → use var(--sans) or var(--serif)
- 48px touch targets          → minimum is 44px per V2 spec rule 7
- PopupShell in a view       → chrome owned by shell, views are body-only
```
