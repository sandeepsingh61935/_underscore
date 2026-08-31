# AMO Screenshot & Listing Creative Strategy

**Product:** Underscore Highlighter  
**Channel:** Firefox Add-ons (AMO)  
**Canvas:** 1280×800 PNG (AMO preferred)  
**Brand:** Editorial V2/V3 — paper `#F7F5F0`, ink `#111110`, single terracotta
accent

---

## Goal

Convert a skimming Firefox user into an install in under 5 seconds of gallery
scanning. Screenshots must answer, in order:

1. **What is it?** — highlight text on any page
2. **Where does it go?** — a personal library by site
3. **Do I need an account?** — no (guest / local-first)
4. **Can I get value later?** — search, export, optional sync

Avoid: AI hype, cluttered browser chrome, fake social proof, feature laundry
lists.

---

## Narrative arc (5 frames)

| #   | File             | Job               | Headline                 | Sub                                           |
| --- | ---------------- | ----------------- | ------------------------ | --------------------------------------------- |
| 01  | `01-hero.png`    | Category + action | Highlight the web.       | Keep the lines worth rereading.               |
| 02  | `02-library.png` | Outcome           | Your library, by site.   | Passages stay organized—not lost in tabs.     |
| 03  | `03-local.png`   | Trust / friction  | No account required.     | Guest mode keeps highlights on this device.   |
| 04  | `04-find.png`    | Power             | Find it again.           | Search your library. Export when you need it. |
| 05  | `05-sync.png`    | Upside (optional) | Sync when you are ready. | Sign in for cloud library across devices.     |

**Gallery order on AMO:** 01 → 02 → 03 → 04 → 05  
First image is the listing thumbnail in many surfaces—make 01 the strongest.

---

## Visual system

- **Left / copy column:** kicker (mono caps) + serif headline + short sub
- **Right / product:** 400×600 popup card with hairline border, soft elevation
- **Stage:** warm paper field, subtle grid or quiet article backdrop (hero only)
- **Type:** Instrument Serif / Source Serif for titles; DM Sans / Inter for
  body; mono for kickers
- **Accent:** use sparingly (underline mark, CTAs, highlight chip)—not rainbow
  UI
- **No:** browser bookmark bar clutter, unread notification badges, lorem spam

### Do / Don't

| Do                                               | Don't                                   |
| ------------------------------------------------ | --------------------------------------- |
| Show real product IA (Home / Library / Settings) | Invent tabs we do not ship              |
| One idea per frame                               | Cram 6 callouts                         |
| Honest guest vs signed-in                        | Promise E2E encryption we do not have   |
| Short verbs                                      | "Revolutionary AI-powered knowledge OS" |

---

## Listing copy (pair with frames)

**Summary (AMO short):**  
Highlight the web. Save passages to a library you can search, export, and sync.

**Description skeleton:**

1. Open any page → select text → saved to your library
2. Browse by site and section; reopen the source
3. Guest mode works offline on-device; sign in to sync
4. Optional BYOK AI / local tools for power users
5. Privacy link: https://underscore-web-3i0.pages.dev/privacy

---

## Production

```bash
# Generate PNGs into store/amo/screenshots/out/
npm run store:amo-screenshots
```

Source frames: `store/amo/screenshots/frames/*.html`  
Strategy updates: this file.

### After generate

1. Open `out/` and spot-check sharpness at 100%
2. Upload 01–05 to AMO in order
3. Optional later: 2400×1800 promo tile (not required for first listing)

---

## Localization / variants (later)

- en-US first
- Consider en shorter headlines if AMO truncates
- Dark-mode set only if product ships polished dark popup (skip for v1 listing)

---

## Success criteria

- Someone unfamiliar with the product can explain it after viewing 01–02 only
- Frame 03 reduces "another account?" bounce
- No screenshot contradicts privacy policy or permissions narrative
