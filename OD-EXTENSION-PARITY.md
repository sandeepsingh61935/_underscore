# Extension mockup ↔ codebase parity

**Mockup:** `underscore-extension-prototype.html`  
**Code branch:** `feature/v3-extension-ui` (last parity: `5f39f03`)  
**Repo:** `_underscore` (worktree `.worktrees/v3-extension-ui`)

## Direction of truth

| Phase | Source of truth | Action |
|-------|-----------------|--------|
| After reverse-sync (this file) | **OD ≈ production** baseline | Design in OD |
| During design iteration | **OD** for IA/copy/structure | Agent ports OD → code |
| After port | **git** for shipped behavior | `npm run build` on branch |

## Settings structure (parity)

1. Head — Settings  
2. Local card (guest) — Local only · Sign in · Free  
3. Plan — Guest · Free · Paid segments  
4. Typography — expand  
5. Appearance — Theme light|dark|system  
6. Account + billing (signed-in) — Upgrade/Portal/Sync  
7. Library — Sync (%, bar) · Export MD·XLSX · Delete  
8. AI · setup — Configure providers · Connect to AI  
9. Session — Sign out  

## Mode transitions (mock + production)

- Guest → Free/Paid: sign-in  
- Free → Paid (no entitlement): Upgrade (billing)  
- Paid entitled Free ↔ Paid: free mode flip  
- Signed-in → Guest: sign-out  

## How to sync OD → code

1. Edit mockup in Open Design.  
2. In Grok / agent on `_underscore` branch: “Port Settings (or screen X) from OD mockup.”  
3. Agent reads this HTML / MCP artifact and patches `src/…`.  
4. Run `npm run build` on the current git branch.  
5. Note the new commit hash here after major ports.

## Reverse-sync (code → OD)

Run when production drifts: agent rewrites `viewSettings` / related views from `SettingsPage.tsx` + chrome into this HTML.
