# _underscore v3 — extension design canvas

Mock canvas for adopting the **Web-Prototype** extension UI (`underscore-extension-prototype.html`) as the next design-system layer on the 400×600 popup.

v2 mid-fi wireframes stay at `ui_kits/extension/v2/` for comparison. This kit is **not** production React — it is the visual contract for a future production adoption pass.

## Open

```bash
cd ui_kits/extension/v3
python3 -m http.server 8765
# → http://127.0.0.1:8765/
```

Same DesignCanvas shell as v2: pan/zoom, reorderable artboards, focus overlay, Tweaks (accent + type preset).

## Source of truth

| Artifact | Role |
|----------|------|
| Zip: `Web-Prototype.zip` → `underscore-extension-prototype.html` | Interactive product mock + CSS |
| Handoff plans in the zip | Home, chrome, AI, typography, motion |
| This kit | Multi-artboard review canvas for adoption |

## What we replace vs keep

**Replace**

- Modes → **Guest · Starter · Pro** (was Ephemeral / Local / Cloud / AI)
- Tabs → **Home · Library · Ask · Settings**
- Home → **Current-page anchor + Recent stream**
- Chrome → **mode pill → Settings** (no header Switch)
- Mode select → **segmented control in Settings**
- Type → semantic roles + control geometry tokens
- AI → Ask tab + Connect hub + Models

**Keep**

- Paper / ink / single terracotta accent
- Serif · sans · mono triad
- 400×600 popup, hairline rules, 2px radius
- List density, editorial voice

## Layout

| File | Contents |
|------|----------|
| `tokens.css` | `:root` + dark flip |
| `product.css` | Prototype product CSS (stage/rail shell stripped) |
| `primitives.jsx` | Modes, sample data, `PopupShell`, atoms |
| `screens-*.jsx` | Artboards by surface |
| `index.html` | Canvas sections ①–⑥ |
| `design-canvas.jsx` / `tweaks-panel.jsx` / `type-presets.js` | Shared infra (from v2) |

## Sections

1. **System** — adopt map, tokens, chrome contract, controls
2. **Home** — first-run, Guest/Starter/Pro, dark
3. **Library** — domains/sections, full search+filter+tags, highlight notes/tags states, control language
4. **Ask** — locked, empty, thread, streaming, no model
5. **Settings · Auth** — shell settings + sign-in flows
6. **Typography** — hierarchy spec · full panel (presets/fonts/scale/spacing/margins/import) · Apply/Reset
7. **Billing · Polar** — Guest/Free/Paid/past due/cancel · Upgrade compare · return banners · Ask locks
8. **Dialogs · caution** — delete domain/section/highlight/library · sign out · remove key · discard edits
9. **AI** — hub locked/open, provider setup, models, insights

### Billing rules (mock)

- Pills are **status**, not buttons: Free · Paid · Past due
- **Upgrade** → Polar checkout (external); **Manage** → Polar portal; **Sync** pulls entitlement
- Never demote plan on load/error; one accent commercial CTA per view
- No in-app card fields or invoice tables

### Typography rules (mock)

- Live specimen at top of open panel
- Six sections: Presets · Fonts · Scale · Spacing · Margins · Import
- Wheel pickers for extension density; Apply / Reset footer

## Production note

Do not import this kit into the extension build. When implementing:

1. Align `TabBar` to 4 tabs (add Ask)
2. Align mode branding to Guest / Starter / Pro
3. Port Home Anchor+Stream
4. Port chrome mode pill contract
5. Map tokens into `src/ui-system/theme/global.css`
