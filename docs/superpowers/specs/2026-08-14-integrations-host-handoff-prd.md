# PRD: Integrations host handoff (deep links + install commands)

**Status:** `ready-for-agent`  
**Date:** 2026-08-14  
**Amends:** ADR-029 §4 (Connect UX), amateur Connect PRD 2026-08-13 (supersedes hub primary “Connect = copy URL”)  
**Does not reopen:** ADR-024 resource-server seam (Settings never starts OAuth), ADR-029 Connected = OAuth grant count > 0 OR recent successful Cloud MCP session  
**Public Cloud MCP URL (current):** `https://underscore-mcp.sandeepss128961.workers.dev/mcp` (from env; public URL is not a secret)

---

## Problem Statement

I am a Paid user. I want my agent (Claude, Cursor, Codex, ChatGPT, Grok) to read my synced cloud library the way Figma does: open the host, authenticate, see **Connected**. Today Integrations shows a remote MCP URL and a **Connect** button that only copies that URL and tells me to paste it somewhere in the agent. The button does not connect anything. I feel the product is unfinished compared to industry standard remote MCP (marketplace / deep link / one command → host OAuth → Connected).

## Solution

Integrations becomes a **host handoff** surface, not a fake Connect.

1. I pick my AI app (or open Host setup from the catalog).
2. I get **one primary action** that matches how that host works:
   - **Cursor:** **Open in Cursor** (MCP install deep link with Cloud MCP URL pre-filled).
   - **Claude Code / Codex:** **Copy install command** (one CLI line with the remote URL).
   - **Other hosts:** **Copy remote URL** (or host-specific paste path), never a lying “Connect.”
3. Short numbered steps tell me OAuth happens **in the agent / browser**, then to return here.
4. Hub status stays **Ready** until a real grant or MCP session appears; then **Connected**.
5. Raw URL, config snippets, and Bearer script notes live under **Server details / Manual / Advanced**.
6. MCP registry and official plugins are **out of scope** (tracked as TODOs only).

---

## User Stories

1. As a Paid user, I want Integrations to explain that OAuth happens in my agent, so that I do not expect Settings to log me into Claude or Cursor.
2. As a Paid user, I want status Ready / Connected with plain-language detail, so that I know whether any agent has actually reached Cloud MCP.
3. As a Paid user, I do not want a primary button labeled Connect that only copies a URL, so that the product does not lie about what the click does.
4. As a Paid user, I want **Add an AI app** as the hub primary CTA, so that the next step is choosing where agents run.
5. As a Paid user, I want Remote MCP URL and **Copy URL** under collapsed **Server details**, so that power users still have the URL without making paste the default path.
6. As a Paid user, I want Advanced (Bearer script warning) under Server details or Manual, so that script setup stays available but secondary.
7. As a Paid user, I want an Active list of approved clients when I have OAuth grants, so that I can see who has access.
8. As a Paid user with only a recent MCP session, I want Connected detail that says my agent reached Cloud MCP, so that JWT-only success is not described as an OAuth client.
9. As a Paid user, I want empty Active copy when nothing is connected, so that I know I still need to complete host setup.
10. As a Paid user, I want to revoke an existing grant from Active when revoke is already wired, so that I can cut off a client.
11. As a Paid user, I want grants and last MCP session to reload when I open or focus Integrations, so that Connected appears after browser approve without a fake “Check connection.”
12. As a Paid user, I want copying or opening a deep link never to flip status to Connected, so that Connected means the agent actually talked to Cloud MCP.
13. As a guest, I want Integrations visible but locked with sign-in CTA, so that I understand entitlement.
14. As a signed-in free or past-due user, I want Integrations locked with upgrade CTA, so that I understand Paid unlocks host handoff.
15. As a locked user, I do not want deep link or copy handoff to run, so that setup is not offered without entitlement.
16. As a Paid user on the picker, I want each host row to show whether setup is one-click, one command, or paste URL, so that I set correct expectations before setup.
17. As a Paid user who uses Cursor, I want **Open in Cursor** as the primary setup action, so that Cursor’s install dialog opens with the Cloud MCP URL without me editing JSON.
18. As a Paid user who uses Cursor, I want the deep link to use the standard Cursor MCP install scheme with name and base64 config containing only the remote URL, so that install matches Cursor’s documented install links.
19. As a Paid user who uses Cursor, if the deep link does not open, I want a clear inline fallback (copy install link or Manual), so that I am not stuck.
20. As a Paid user who uses Claude Code, I want **Copy install command** with `claude mcp add --transport http underscore <url>`, so that one paste in the terminal registers the server.
21. As a Paid user who uses Codex, I want **Copy install command** with `codex mcp add underscore --url <url>`, so that setup matches Codex’s remote MCP add flow.
22. As a Paid user who uses Claude Desktop, ChatGPT, Grok, Gemini, Antigravity, or Other, I want a primary **Copy remote URL** (or equivalent honest label) plus short paste steps, so that hosts without deep links still work.
23. As a Paid user on any host setup screen, I want 3–4 numbered steps that end with “return here for Connected,” so that the Figma-like loop is explicit.
24. As a Paid user on host setup, I want Manual / Advanced collapsed with config snippet and Bearer warning, so that JSON paste is optional.
25. As a Paid user, I want the primary button to show **Copied** for ~2s after a successful clipboard write, so that I know copy worked.
26. As a Paid user, I want an optional brief “Opening Cursor…” style feedback after deep link click, so that I know the click registered without claiming Connected.
27. As a Paid user, I do not want a Check connection button that fakes success, so that status only reflects grants/session.
28. As a Paid user on the web app, I want the same hub, picker, and host handoff behavior as in the extension, so that I do not need the extension to finish Integrations.
29. As a Paid user in the extension popup, I want the same hierarchy (status → Active → Add → Server details; setup = steps + primary + Manual), so that popup and web stay aligned.
30. As a Paid user, I want Models setup free of MCP URL and OAuth talk, so that Ask keys stay a different job.
31. As a Paid user, I want Integrations free of provider API keys / BYOK, so that I do not confuse Models with agents.
32. As a Paid user with the legacy local bridge still enabled, I want a non-blocking migrate notice, so that I know Cloud MCP is the product path.
33. As a Paid user who never used the bridge, I do not want a blocking bridge banner, so that the hub stays about host handoff.
34. As a Paid user, I want Settings never to open OAuth authorize or consent, so that ADR-024 resource-server rules hold.
35. As a Paid user, I want the Cloud MCP URL to remain publicly shareable, so that catalogs and deep links can use it; security stays on OAuth/JWT and Paid gate.
36. As an implementer, I want each catalog host to declare handoff kind (deep link, copy command, copy URL), primary label, steps, and templates, so that UI only renders resolved actions.
37. As an implementer, I want pure helpers for Cursor install link encoding and command template fill, so that web and extension share one source of truth.
38. As an implementer, I want wireframe artboards updated for hub and host setup, so that `/ui-preflight` has a current visual spec.
39. As a tester, I want to assert no hub primary control labeled Connect that only copies the URL, so that the amateur-copy regression cannot return as the main path.
40. As a tester, I want to assert open/copy handoff does not change Integrations status, so that Connected stays observation-only.
41. As a tester, I want to assert Cursor primary action resolves to a deep link whose decoded config contains the env Cloud MCP URL and no token, so that install links stay safe and correct.
42. As a tester, I want to assert Claude Code and Codex primary actions resolve to the documented install commands with URL substitution, so that CLI handoff does not drift.
43. As a product owner, I want registry listing and official host plugins tracked as explicit out-of-scope TODOs, so that v1 stays shippable without marketplace work.
44. As a product owner, I want a future stable brand MCP hostname listed as TODO only, so that workers.dev can ship now.

---

## Implementation Decisions

### Product / architecture

- **Host-initiated OAuth remains the only OAuth path.** Settings is not an OAuth client. No change to Worker protected-resource metadata, consent, or grant storage.
- **Connected semantics unchanged:** grant count > 0 OR recent successful Cloud MCP session. Handoff actions must not write optimistic Connected.
- **Public MCP URL is intentional.** Auth and Paid gate protect data; do not treat the URL as a secret.
- **Supersedes amateur hub chrome:** primary hub action is **Add an AI app**, not Connect-as-copy. Copy URL moves to Server details / Manual.
- **No schema or Worker contract changes** for this PRD.
- **No grant↔catalog host id matching** (still deferred).
- **Registry / plugins / brand domain:** document as TODOs only; do not implement.

### Catalog (Host connection module)

Extend the existing AI apps catalog so each host owns handoff metadata:

- `handoff`: `deep_link` | `copy_command` | `copy_url`
- `primaryLabel`: honest button text (e.g. Open in Cursor, Copy install command, Copy remote URL)
- `commandTemplate` when `copy_command` (placeholder for MCP URL only; no token placeholder)
- `steps`: 3–4 plain-language steps
- Keep existing config snippet + restart for Manual / Advanced
- Amateur hints must not push JWT / `get_session` as the default path

Prototype shape (decision-rich, not a full implementation):

```ts
type HandoffKind = 'deep_link' | 'copy_command' | 'copy_url';

// Per host: handoff + primaryLabel + steps + optional commandTemplate
// Cursor deep link built at runtime from remote URL only:
// cursor://anysphere.cursor-deeplink/mcp/install?name=_underscore&config=<base64({"url":"<mcpUrl>"})>
```

### Pure helpers

- Build Cursor MCP install deep link from server name + remote URL (base64 config is URL-only JSON).
- Fill command templates with remote URL.
- Resolve primary action `{ kind, label, href? | text? }` from catalog + remote URL for UI to render.

### Hub UI

- Intro: agents read synced library; OAuth in agent.
- Status row + detail (existing status module + detail helpers).
- Active section (grants / empty state / revoke if already wired).
- Primary full-width **Add an AI app**.
- Collapsed **Server details**: remote URL, **Copy URL**, Advanced Bearer note.
- Locked and legacy-bridge behaviors preserved (non-blocking).
- Do not show a full-width **Connect** that only copies the URL.

### Host setup UI

- Numbered steps (what you’ll do).
- One primary CTA from resolved handoff.
- Copy success → temporary **Copied**; deep link → optional “Opening…” feedback, never Connected.
- Deep link failure → inline error + Manual fallback (copy link / URL / command).
- Collapsed Manual / Advanced: snippet, restart, Bearer warning.
- No fake Check connection.

### Surfaces

- Extension Connect-to-AI flow and web Integrations panel share the same catalog, helpers, and chrome patterns (body-only views; PopupShell owns popup chrome).
- V2 Editorial tokens only; no hardcoded hex; no Tailwind; no emoji in product UI copy.

### Wireframes

- Update Connect-to-AI / MCP connections wireframes so hub and setup match this PRD (replace bridge-era security code / fake Connect artboards).

### Deferred TODOs (record only)

| ID | Item |
|----|------|
| T1 | MCP Registry entry |
| T2 | Claude Code official plugin |
| T3 | Cursor marketplace / plugin |
| T4 | Codex plugin |
| T5 | Stable brand MCP hostname |
| T6 | Per-host Connected when grant client metadata supports it |

---

## Testing Decisions

### What good tests do

- Assert **user-visible behavior**: labels, copy contents, href/text of primary actions, status not flipping on handoff, locked surfaces.
- Prefer **pure helpers** and **component render** at existing Integrations seams.
- Do **not** assert CSS, file paths, or run a real host OAuth browser flow.
- Do **not** require live Cursor/Claude installs in CI.

### Proposed test seams (confirm before implement)

Prefer existing highest seams; add pure helpers only where needed.

| Seam | What to assert |
|------|----------------|
| **Catalog + pure handoff helpers** (extend existing AI apps unit tests) | Order of hosts; handoff kind per host; Cursor deep link decodes to URL-only config; Claude/Codex command strings; no `{{TOKEN}}` / JWT in primary templates |
| **Hub component** (extend existing connections hub tests) | No primary Connect-as-copy; **Add an AI app** present when allowed; Server details exposes Copy URL; locked blocks handoff entry; status Ready after copy props |
| **Host setup component** (extend or add beside existing host tip tests) | Primary label and action per host; steps mention agent/browser approve; Manual collapsed; copy feedback if tested at component level |
| **Integrations status** (existing status pure module) | Unchanged: copy/open does not feed into Connected; Connected still grants OR recent session |
| **Focus reload** (existing connect hook behavior if covered) | Grants/session reload on focus remains; no new polling |

New pure modules (if extracted): unit-test at helper boundary only — highest pure seam before UI.

### Prior art

- Unit tests for AI apps catalog and URL template fill
- Unit tests for connections hub (locked, Ready, no optimistic Connected from copy)
- Integrations status pure tests (if present)
- Host tip / setup views as rendered content tests

---

## Out of Scope

- Publishing to MCP Registry or any host marketplace
- Official Claude / Cursor / Codex plugins or Agent Skills packages
- Renaming workers.dev URL to a brand domain (document only)
- Settings-initiated OAuth or Device Code as product Connect
- Changing Connected definition or Worker auth contracts
- Matching OAuth grant client ids to catalog host rows
- Building a global public “all MCPs” directory inside the product
- Cutting residual background bridge process (unless already separate work)
- Models / BYOK / provider key UI
- E2E against real Cursor or Claude Code OAuth in CI

---

## Further Notes

### Industry pattern (Figma-like)

Remote MCP discovery is **host-side** (plugin, deep link, or `mcp add` command). The product’s job is stable URL + OAuth resource server + honest handoff + status/revoke. This PRD is the first product slice: **in-app deep links and commands**. Registry/plugins come later so the row can appear inside host MCPs lists without our app open.

### Relationship to 2026-08-13 amateur Connect PRD

That PRD correctly locked host-initiated OAuth and Connected observation. Its hub primary **Connect = copy URL** is **replaced** by catalog-driven handoff. Copy URL remains as secondary Server details. Advanced Bearer note remains secondary. Status and entitlement rules remain.

### ADR alignment

- **ADR-024:** resource server; hosts are OAuth clients.
- **ADR-029:** Cloud MCP product path; Integrations never asks for model keys; Connected not optimistic.

### Implementation order (guidance only)

1. Pure handoff helpers + catalog fields + unit tests  
2. Host setup UI primary CTA + steps + Manual  
3. Hub chrome: remove Connect-as-copy primary; Server details; copy  
4. Wireframe update + shared web/extension wiring  
5. Regression: locked, status, Advanced, no OAuth from Settings  

---

## Test seams check (for assignee)

Before coding, confirm these seams are acceptable:

1. Catalog + pure handoff helpers (deep link encode, command fill, resolve primary action)  
2. Hub component behavior (no fake Connect; Add an AI app; Server details Copy URL)  
3. Host setup component (primary per handoff kind; steps; Manual)  
4. Existing Integrations status pure module (Connected rules unchanged)  

If any seam should be higher/lower, adjust before implement.
