# PRD: Amateur Integrations Connect (C1 + C2)

**Status:** `ready-for-agent`  
**Date:** 2026-08-13  
**Amends:** ADR-029 §4 (Connect UX), ADR-024 (host-initiated OAuth)  
**Does not reopen:** ADR-024 resource-server seam, ADR-029 Connected = grant or recent MCP session

---

## Problem Statement

I am a Paid user. I want Grok (or ChatGPT, Cursor, Claude) to read my synced highlight library. Integrations tells me to copy a URL, choose OAuth or a Bearer JWT, edit a config file, restart, and call `get_session`. I do not know what those things are. Copying the snippet never says Connected. I cannot tell if I succeeded.

## Solution

On Integrations I see one **Connect**. It copies the Cloud MCP URL and tells me to add that server in my agent, then approve when the browser opens. Status stays **Ready** until my agent actually connects. Host tips (optional) show where to paste and a URL-only snippet. JWT and script talk live under **Advanced**. When I come back to Integrations, I see **Connected** if I approved OAuth or my agent reached Cloud MCP.

## User Stories

1. As a Paid user, I want one Connect control, so that I am not taught MCP before anything works.
2. As a Paid user, I want Connect to copy the remote Cloud MCP URL, so that I have exactly one thing to give my agent.
3. As a Paid user, I want the Connect button to read Copied after a successful copy, so that I know the action worked.
4. As a Paid user, I want to stay on the Integrations hub after Connect, so that I am not sent through a wizard.
5. As a Paid user, I want status to stay Ready after I copy, so that I do not think copying finished setup.
6. As a Paid user, I want a one-line next step after copy (add the URL in the agent, approve when asked), so that I know what to do in the other app.
7. As a Paid user, I want Connect to remain available when I am already Connected, so that I can add a second agent the same way.
8. As a Paid user who uses ChatGPT, I want to add the Cloud MCP URL in ChatGPT connectors and approve in the browser, so that ChatGPT can read my synced library.
9. As a Paid user who uses Grok, I want a host tip that says where to paste the URL in Grok, so that I do not have to invent a config path.
10. As a Paid user who uses Cursor, I want a host tip with a URL-only config snippet, so that I can paste into Cursor MCP settings without a token.
11. As a Paid user who uses Claude Code or Claude Desktop, I want the same URL-only host tip pattern, so that setup matches other desktop hosts.
12. As a Paid user who uses Codex, Gemini, Antigravity, or another MCP host, I want that host in the same Host tips list, so that I am not a special case.
13. As a Paid user, I want Host tips behind a secondary control, so that the first screen is Connect, not a catalog.
14. As a Paid user, I want Host tips to drill in (list, then one host), so that the hub stays simple.
15. As a Paid user on a host tip screen, I want paste location, a URL-only snippet, and a restart hint, so that I can finish in the other app.
16. As a Paid user on a host tip screen, I do not want JWT, TOML-as-auth, or `get_session` instructions, so that I am not sent down the script path.
17. As a Paid user, I want a collapsed Advanced section, so that script setup is available but not the default.
18. As a power user, I want Advanced to say I may send `Authorization: Bearer` with a Supabase access token, so that scripts still work.
19. As a Paid user, I do not want a Copy access token button, so that my session JWT is not put on the clipboard by the product.
20. As a Paid user, I do not want Settings to start OAuth, so that I am not promised a one-click login we cannot do (the agent host starts OAuth).
21. As a Paid user, I want Connected when I have approved at least one OAuth client, so that a real grant is visible.
22. As a Paid user, I want Connected when my agent reached Cloud MCP recently (JWT session), so that a script or host that used a Bearer token is not stuck on Ready.
23. As a Paid user with only a recent MCP session and no grant, I want the subtitle to say my agent reached Cloud MCP, so that the UI does not claim I have an OAuth client.
24. As a Paid user with an OAuth grant, I want the subtitle or list to reflect approved clients, so that I can see who has access.
25. As a Paid user, I want grants to reload when I open or focus Integrations, so that Connected appears after I approve in the browser without polling.
26. As a Paid user on the web app, I want the same Connect / Advanced / Host tips behavior as in the extension, so that I do not need the extension to finish Integrations.
27. As a Paid user in the extension popup, I want the same Connect behavior, so that I can start from Settings in the popup.
28. As a guest, I want Integrations visible but locked, so that I understand I must sign in.
29. As a signed-in free or past-due user, I want Integrations visible but locked with an upgrade path, so that I understand Paid unlocks Connect.
30. As a locked user, I do not want Connect to copy the URL, so that setup is not offered without entitlement.
31. As a Paid user, I want Models setup to stay free of MCP URL and OAuth talk, so that Ask keys stay a different job.
32. As a Paid user, I want Integrations copy to stay free of API keys and BYOK, so that I do not confuse Models with agents.
33. As a Paid user who still has the old local bridge enabled, I want a one-line migrate notice, so that I know to move to Cloud MCP.
34. As a Paid user who never used the bridge, I do not want a blocking bridge banner, so that the hub stays about Connect.
35. As a Paid user, I want copying the snippet never to mark Connected, so that Connected means the agent actually talked to Cloud MCP.
36. As a Paid user, I want to revoke access later from existing connected-app listing if it is already wired, so that I can cut off a client — matching grants to catalog host names is not required for this story.
37. As an implementer, I want one Host connection module to own per-host paste + snippet + restart, so that web and extension do not invent two recipes.
38. As an implementer, I want one Connect next-action module to own Connect / Copied / locked, so that both surfaces only render.
39. As a tester, I want to assert amateur copy never contains JWT, `get_session`, or “I copied the snippet”, so that the power-user recipe cannot regress onto the hub.
40. As a tester, I want to assert Connect does not open an OAuth authorize URL, so that we do not violate the resource-server seam.

## Implementation Decisions

- Deepen **Host connection**: given a catalog host, return amateur host-tip content only (where to paste, URL-filled snippet, restart). Do not encode JWT vs OAuth as the product path. The existing one-bit auth hint becomes unused for Connect.
- Deepen **Connect next-action**: given entitlement, copy state, and Integrations status, return the hub action (Connect, Copied, or locked / upgrade). Web and extension only render that action. Copying the URL is the only Connect side effect.
- Keep **Integrations status** as Off | Ready | Connected. Copying does not change status. Connected remains grant count > 0 or a recent successful Cloud MCP session (existing rule).
- Add a **status detail** next to status: if Connected and there is at least one grant, describe approved clients; if Connected with no grants, say the agent reached Cloud MCP. Do not say “approved OAuth client” for JWT-only.
- **Advanced** is collapsed on the hub. Copy: use a Supabase access token as Bearer. No control that copies the live session JWT. No `get_session` on the amateur hub or host tips.
- **Host tips** stay a drill-in (list → one host). Hub primary chrome is status + Connect + optional Advanced + Host tips entry.
- Reload OAuth grants (and last MCP session) when the Integrations surface is shown or focused. Do not poll. Do not require a manual Refresh control.
- Settings / Connect must not start OAuth and must not open `/oauth/consent`. The agent host remains the OAuth client; Cloud MCP remains the resource server (ADR-024).
- Same next-action on web Settings Integrations and the extension Integrations flow. Locked accounts keep the existing upgrade / sign-in CTA and do not run Connect.
- Keep the existing one-line legacy bridge migrate notice when the old bridge is still enabled. Not a second setup path.
- No schema changes. No Worker contract changes. No new Connected rule. Do not join OAuth grant client names to catalog host ids in this work.
- JWT / TOML-as-auth / `get_session` are not a separate scripts module; they are omitted from the amateur interface (folded C3).
- Hard seam with Models is unchanged.

## Testing Decisions

Good tests assert what the user can do and read. They do not assert file layout, hook names, or CSS. They do not start a browser OAuth flow.

**Seams (highest first — confirm these):**

1. **Connect next-action** (new, shared) — inputs: entitled or not, copied or not, status. Outputs: show Connect, show Copied, or locked (no copy). Highest new seam. Prefer this over testing each view’s button markup twice.
2. **Host connection** (new, shared) — inputs: catalog host + remote URL. Outputs: paste target, URL-only snippet, restart. Assert no JWT, no `get_session`, no bridge token, URL substituted. Prefer this over snapshotting two setup views.
3. **Integrations status** (existing) — keep current Off / Ready / Connected tests. Copying is not an input. Do not change the Connected rule.
4. **Status detail** (small, next to status) — Connected + grants vs Connected + session only vs Ready. Assert honest subtitle.
5. **Hub / web list render** (existing view tests) — one Connect; no `get_session` / “I copied the snippet” on the first screen; Advanced contains Bearer JWT instruction and no copy-token control; Host tips still opens the catalog drill-in.
6. **Host tip view** (existing setup views, slimmer) — where + snippet + restart only.
7. **Reload on show** — when the Integrations surface mounts or is focused, grants/session are fetched again (mock the existing grants/session ports). No timer.

Do **not** add seams for: Worker 401 / metadata, consent page, grant-to-host matching, copying a session JWT, opening an authorize URL.

Prior art: Integrations status unit tests; MCP catalog / setup-step tests (replace 5-step assertions); Connect flow tests that today lock the Host tips stack; web Settings / AiPanel tests that lock Integrations vs Models copy.

## Out of Scope

- Settings-initiated OAuth or deep links into Grok / ChatGPT / Cursor
- Copying the user’s live access token
- Matching OAuth grants to catalog host ids (“Grok is Connected”)
- New status value (Waiting)
- Polling while Integrations is open
- Changing Cloud MCP Worker auth, paid gate, or consent
- Bridge hard-delete
- Models catalog / BYOK
- New database tables

## Further Notes

Architecture review: C1 + C2 are the work. C3 is a rule inside them (hide scripts on the amateur path). C4 is a constraint (do not start OAuth from Settings). C5 is deferred.

Honest amateur walk: Connect → URL is on the clipboard → add the server in the agent → approve if the host asks → return to Integrations → Connected.

If these test seams are wrong, say so before implementation. The GitHub issue was not opened in this session (`gh` is not authenticated).
