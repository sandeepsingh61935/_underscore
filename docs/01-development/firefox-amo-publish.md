# Firefox Add-ons (AMO) — Publish Prep

**Status:** engineering prep largely done — listing/QA/auth still open  
**Package name:** Underscore Highlighter  
**Firefox extension ID:** `underscore-highlighter@underscore`  
**Manifest:** MV3 (WXT emits Firefox background as `scripts[]`)  
**Min Firefox:** 140.0  
**License on AMO:** GNU GPL v3 (repo `LICENSE` / `package.json` `GPL-3.0-only`)  

Do **not** change the gecko `id` after the first AMO submission.

---

## Progress

| Area | State |
|------|--------|
| Gecko ID, MV3, data collection perms | Done (`wxt.config.ts`) |
| Chrome-only manifest fields stripped on Firefox | Done |
| `build:firefox` / `zip:firefox` + sources zip | Done |
| Privacy policy rewrite (`PRIVACY.md` + in-app `/privacy`) | Done — **still need public HTTPS deploy** |
| `onSuspend` guard for Firefox event pages | Done |
| package license aligned to GPL-3.0-only | Done |
| OAuth redirect allowlist (Supabase + Google) | **Open** — do after first temp install |
| Firefox manual QA | **Open** |
| Screenshots + listing creative | **Ready** — `store/amo/screenshots/out/` + `LISTING-COPY.md` |
| AMO developer listing submit | **Open** |
| Public privacy URL on web app | **Live** — https://underscore-web-3i0.pages.dev/privacy |

---

## Quick commands

```bash
# Production Firefox build (load as temporary add-on from about:debugging)
npm run build:firefox

# AMO artifacts: extension zip + sources zip
npm run zip:firefox
# → .output/underscore-highlighter-<version>-firefox.zip
# → .output/underscore-highlighter-<version>-sources.zip
```

Load unpacked for manual QA: `.output/firefox-mv3/` → select `manifest.json`.

---

## What is configured in repo

| Item | Where |
|------|--------|
| Gecko ID + `strict_min_version` | `wxt.config.ts` → `browser_specific_settings.gecko` |
| Data collection permissions (Nov 2025+) | `gecko.data_collection_permissions` |
| Strip Chrome-only `key` / `oauth2` / `externally_connectable` on Firefox | Manifest is a `({ browser }) =>` function |
| MV3 for Firefox + Chrome | `manifestVersion: 3` |
| Sources zip for AMO review | `zip.zipSources: true` (+ excludes for secrets/build junk) |
| npm scripts | `build:firefox`, `zip:firefox`, `zip:chrome` |
| Privacy copy | `PRIVACY.md`, `src/pages/PrivacyPage.tsx` |

Data collection declared (required) — must use AMO enum names only:

- `websiteContent` — highlighted page text  
- `websiteActivity` — page URLs associated with highlights  
- `personallyIdentifyingInfo` — account email (not `contactInfo`)  
- `authenticationInfo` — sign-in / session  

No optional `technicalAndInteraction` until a real telemetry sink ships.  
`strict_min_version` is **140.0** so `data_collection_permissions` is valid.

---

## AMO listing checklist

### Account & listing

- [ ] Create / sign in at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
- [ ] New listing → “On this site” (listed) or self-distributed if preferred
- [ ] Upload `underscore-highlighter-*-firefox.zip`
- [ ] Upload sources zip when prompted (minified build)
- [ ] Confirm extension ID matches `underscore-highlighter@underscore`

### Store metadata (draft offline first)

- [ ] **Name:** Underscore Highlighter (≤50 chars)
- [ ] **Summary:** `Highlight the web. Save passages to a library you can search, export, and sync.`
- [ ] **Description:** guest device library, signed-in sync, optional BYOK AI, export on eligible plans
- [ ] **Categories:** Search Tools and/or Bookmarks (pick best fit at submit time)
- [ ] **Support email:** e.g. privacy@underscore.dev or a support inbox you monitor
- [ ] **Homepage:** https://underscore-web-3i0.pages.dev
- [ ] **License:** GNU GPL v3.0
- [x] **Privacy policy URL:** https://underscore-web-3i0.pages.dev/privacy

### Privacy

- [x] Rewrite policy for guest / account / BYOK / Polar / Supabase (`PRIVACY.md`)
- [x] In-app page matches policy (`PrivacyPage`)
- [x] **Deploy web app** — https://underscore-web-3i0.pages.dev/privacy
- [x] Set `VITE_WEB_APP_URL=https://underscore-web-3i0.pages.dev` in local `.env.production`
- [ ] AMO privacy questionnaire matches `data_collection_permissions` + host permissions
- [ ] Reviewer notes explain localhost Ollama (`11434`) and MCP bridge (`17342`)

### Listing assets

- [x] Icon assets in package (`icon-128.png`, `icon-512.png`, …)
- [x] Marketing screenshots (5) — strategy + frames in `store/amo/`  
  - Retina: `store/amo/screenshots/out/01–05.png` (2560×1600)  
  - AMO canonical: `store/amo/screenshots/out/amo-1280/` (1280×800)  
  - Regenerate: `npm run store:amo-screenshots`  
- [ ] Optional promo tile later

### Permissions justification (paste into reviewer notes)

| Permission / host | Why |
|-------------------|-----|
| `activeTab` | Highlight / restore on the page the user is using |
| `storage` | Local library, prefs, session, optional API keys |
| `alarms` | Auth / verification maintenance |
| `identity` | Google OAuth via `launchWebAuthFlow` + Supabase |
| Supabase host | Auth, sync, account APIs |
| Polar hosts | Paid checkout |
| LLM API hosts | Optional BYOK providers |
| localhost Ollama / MCP | Optional local AI / agent bridge only |

---

## Manual Firefox QA (before submit)

Clean profile + production build:

1. `about:debugging` → This Firefox → Load Temporary Add-on → `.output/firefox-mv3/manifest.json`
2. Popup: Home / Library / Settings render
3. Guest highlight on HTTPS page → Library
4. Reload page → highlights restore
5. Capture `browser.identity.getRedirectURL()` (see Auth) and allowlist it, then test Google + email sign-in
6. Sign-out → guest path still works
7. Export / delete scope (if entitled) does not throw
8. AI connect absent keys does not crash
9. Browser Console clean of manifest/CSP errors

---

## Auth redirect setup (Firefox-specific)

### 1. Read the redirect URL from a temporary install

In Firefox, after loading the temp add-on:

1. Open the extension popup or any extension page
2. In the Browser Toolbox / extension console, run:

```js
browser.identity.getRedirectURL()
```

Typical shapes (confirm — do not guess in production allowlists):

```text
https://underscore-highlighter@underscore.extensions.allizom.org/
```

or a UUID-style mozillaextensions URL depending on channel/install type.

Also log it once from background during sign-in (already passed through auth logging on failure).

### 2. Allowlist the exact URL

1. **Supabase** → Authentication → URL configuration → **Redirect URLs** → add the exact string (with trailing slash if returned)
2. **Google Cloud Console** → OAuth 2.0 Client → **Authorized redirect URIs**  
   - Often you add the Supabase callback (`https://<project>.supabase.co/auth/v1/callback`) for the Google provider, and Supabase receives the extension redirect via `redirectTo`.  
   - If Google sign-in still fails, add the identity redirect URL where the flow requires it and re-test.

### 3. Fallback

Email/password + OTP do not depend on `launchWebAuthFlow`. Keep that path working so Firefox users can sign in even if Google OAuth is still being wired.

---

## Public privacy URL

1. Deploy web: `npm run web:deploy` (or your CI) so `/privacy` is live  
2. Confirm `https://<origin>/privacy` shows the updated policy  
3. Put that URL on the AMO listing  
4. Set extension `VITE_WEB_APP_URL=https://<origin>` so popup “Privacy” opens the hosted page (`src/shared/auth/web-legal-urls.ts`)

---

## Source submission notes (AMO form)

```text
Node 20+, npm 10+.

# Public env only (anon keys). Never commit service-role secrets.
npm ci
npm run zip:firefox

Extension: .output/underscore-highlighter-<version>-firefox.zip
Sources:   .output/underscore-highlighter-<version>-sources.zip
```

Sources zip excludes `.env*` and build output. Verified: no `.env` entries in the sources artifact.

---

## Reviewer notes template

> Underscore Highlighter lets users highlight text on web pages and save passages to a personal library.  
> Guest mode stores highlights only on the device. Signing in enables cloud sync and account features via Supabase.  
> Optional AI uses keys the user provides (or local Ollama). Localhost permissions are only for optional Ollama (11434) and a local MCP bridge (17342); core highlighting works without them.  
> Payments use Polar.  
> Privacy policy: https://\<web-app-origin\>/privacy  
> Source build: `npm ci && npm run zip:firefox`

---

## Still open (human / ops)

1. Temp-install Firefox → allowlist identity redirect  
2. Full Firefox QA pass  
3. AMO listing → **Submit for review** until status is **Approved** (see Public listing below)  
4. Bump `package.json` version before each store upload (versions are immutable on AMO)  
5. Optionally refresh root `README.md` product language (still mentions older mode names in places)

---

## Public listing vs “Download failed”

### Banner: “This is not a public listing…”

You only see the page because you are logged in as the developer (elevated
permissions). **It will not appear in AMO search** until the listing is:

1. Distribution: **On this site** (listed), not unlisted / self-distributed only  
2. Listing **complete** (name, summary, description, category, privacy URL, screenshots)  
3. Version **submitted for review**  
4. Status becomes **Approved** (after automated + human review)

Until then, strangers cannot find or install it from search.

### “Add to Firefox” → Download failed. Please check your connection.

Usually **not** your home network. Common causes:

| Cause | What to do |
|-------|------------|
| Listing incomplete / not fully submitted | Finish all required listing fields → Save → Submit for review |
| Version not signed yet | Developer Hub → product → **Versions** → wait until file shows signed; or re-upload |
| Unlisted channel | Switch listing to **On this site** if you want public install |
| Testing before approval | Do **not** rely on Add to Firefox; use temporary install (below) |
| Firefox &lt; `strict_min_version` (140) | Update Firefox |

### Install for QA without AMO download

```bash
npm run build:firefox
# Firefox → about:debugging → This Firefox → Load Temporary Add-on
# → select .output/firefox-mv3/manifest.json
```

Or Developer Hub → your version → **Download** signed XPI if Mozilla already signed it.

### Permission copy (honest, less scary)

After the softer manifest:

- **Required:** access web pages you visit (highlight/restore) + our Supabase project (account/sync when used)  
- **Optional:** AI providers + localhost — only if the user connects those features  
- Content scripts match `http(s)` only (not `file://`)  

You cannot remove “all websites” entirely for a universal highlighter that restores on load; explain it in the listing description.

Chrome Web Store is separate: `npm run zip:chrome`.

---

## Related

- Manifest / zip: `wxt.config.ts`  
- Privacy: `PRIVACY.md`, `src/pages/PrivacyPage.tsx`  
- Legal URL helper: `src/shared/auth/web-legal-urls.ts`  
- Parity context: `docs/superpowers/specs/2026-08-21-popup-web-parity-prd.md`  
- Mozilla data consent: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/  
- AMO hub: https://addons.mozilla.org/developers/  
