# ADR-024: MCP Cloud OAuth (ChatGPT / Remote Clients)

## Status

Accepted (2026-07-11)

## Context

The cloud MCP worker (`underscore-mcp` on Cloudflare Workers) exposes Pro synced highlights over Streamable HTTP. It currently accepts `Authorization: Bearer <supabase_access_token>` for development and manual testing.

ChatGPT Developer Mode connectors require **MCP OAuth 2.1** (protected-resource metadata, PKCE, dynamic client registration or CIMD). Auth / OAuth / Mixed are the only connector auth modes — manual Bearer paste is not supported in the ChatGPT UI.

_underscore already authenticates users via **Supabase Auth** (Google OAuth). Cloud data access uses **Supabase RLS** with the user's JWT. The extension **bridge** adapter (Cursor) uses a local shared token and must not gain OAuth complexity.

## Decision

Add **MCP-compliant OAuth** for the cloud worker using **Supabase Auth as the OAuth 2.1 authorization server**, with the Worker acting as the **resource server** only.

### Open-question resolutions (simplest working fit)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Authorization server | **Supabase Auth OAuth 2.1** | Same user accounts, same JWT, same RLS; Supabase documents MCP + DCR + PKCE support |
| Public URL | **`workers.dev` for v1** | Already deployed; no DNS/custom-domain work for beta |
| Consent UX | **Web app `/oauth/consent`** on existing Cloudflare Pages SPA | Supabase redirects here after authorize; reuse Google sign-in; minimal approve/deny screen |
| Cloud tool scope | **Library read + export only** | `get_session`, `list_collections`, `get_highlights`, `search_highlights`, `export_highlights`; **AI tools stay bridge-only** until cloud OAuth is stable |
| Third-party IdP (Auth0, WorkOS, Stytch) | **Rejected for v1** | Extra vendor, duplicate users, no RLS benefit |
| Worker OAuth BFF | **Contingency only** | Implement only if Supabase OAuth 2.1 spike fails ChatGPT connector requirements |

### Architecture

```
ChatGPT  ──OAuth 2.1 + PKCE + DCR──►  Supabase Auth (authorization server)
                                         │
                                         ▼ redirect
                                    Web app /oauth/consent
                                         │
ChatGPT  ──MCP + Bearer JWT──────────►  CF Worker /mcp (resource server)
                                         │
                                         ▼ RLS
                                    Supabase Postgres (highlights)
```

### Worker (resource server) responsibilities

1. **`GET /.well-known/oauth-protected-resource`** — points ChatGPT at Supabase issuer and supported scopes
2. **`401` responses** on `/mcp` without token — include `WWW-Authenticate` with `resource_metadata` URL (MCP spec)
3. **Validate Bearer token** — existing path: Supabase JWT via `SupabaseMcpAdapter` (unchanged)
4. **Keep `/health`** — include `oauth: true` and `configured: true` when secrets + metadata are live

Example protected-resource metadata:

```json
{
  "resource": "https://underscore-mcp.<account>.workers.dev",
  "authorization_servers": ["https://<project-ref>.supabase.co/auth/v1"],
  "scopes_supported": ["openid", "email", "highlights:read"]
}
```

### Supabase (authorization server) responsibilities

1. Enable OAuth 2.1 server in project config (`auth.oauth_server.enabled = true`)
2. Enable **dynamic client registration** for MCP clients (`allow_dynamic_registration = true`)
3. Set `authorization_url_path` to web app consent route (e.g. `/oauth/consent`)
4. Tokens issued are **standard Supabase JWTs** — existing RLS policies apply without change

### Web app consent page

Minimal SPA route (not extension popup):

- Receives Supabase authorization redirect (`authorization_id` query param)
- If user not signed in → existing Google sign-in flow
- Show: client name (e.g. "ChatGPT"), scopes, Approve / Deny
- Call Supabase Auth OAuth approve/deny APIs
- No new auth system — extension sign-in and web sign-in share Supabase session where possible

### Scopes

| Scope | Grants |
|-------|--------|
| `openid` | OIDC; required for ChatGPT default scope bundle |
| `email` | User email in session / UserInfo |
| `highlights:read` | Library read tools on cloud MCP (enforce via RLS + optional `client_id` claim) |

Export uses `highlights:read` for v1 (no separate scope). Add `highlights:export` later if we split permissions.

### Bridge adapter (unchanged)

- Cursor / Claude Desktop: stdio + local WebSocket token
- **No OAuth** on bridge
- Full library (`basic_local` / `pro_local`) + AI tools when `pro_xai`

### Dev / manual access (unchanged)

- `curl` and scripts may continue using Bearer Supabase JWT directly
- ChatGPT path uses OAuth; both converge on the same JWT validation in the worker

## Implementation phases

### Phase 1 — Supabase + metadata (spike → MVP)

- [x] Worker: `/.well-known/oauth-protected-resource` + `401` `WWW-Authenticate` + `_meta.mcp/www_authenticate`
- [x] Worker `/health` oauth block
- [x] Unit tests (`oauth-metadata`, worker OAuth routes)
- [x] Setup guide: [packages/mcp-server/docs/OAUTH_SETUP.md](../../packages/mcp-server/docs/OAUTH_SETUP.md)
- [ ] Enable Supabase OAuth 2.1 server + DCR on dev project (**manual — currently `feature_disabled`**)
- [ ] Manual OAuth client registration test (before DCR)
- [ ] ChatGPT connector: complete login → `get_session` returns `pro_cloud`

### Phase 2 — Consent + production hardening

- [x] Web app `/oauth/consent` page (`OAuthConsentPage`)
- [x] Sign-in preserves `returnTo` for OAuth consent (Google + email)
- [x] Settings: Connected apps list + revoke (`ConnectedAppsSettings`)
- [ ] RLS review: OAuth `client_id` in policies if needed
- [x] Setup guide updated for consent URL

### Phase 3 — Optional polish

- [ ] Custom domain for stable `resource` URL (e.g. `mcp.underscore.app`)
- [ ] `highlights:export` scope split
- [ ] Cloud AI tools (only after `pro_xai` policy defined for third-party clients)

## Consequences

### Positive

- ChatGPT and other MCP OAuth clients work without per-client JWT copy-paste
- Single identity plane (Supabase); no duplicate user store
- Minimal worker diff (metadata + 401 headers); tool layer unchanged
- RLS remains source of truth for data access

### Negative

- Supabase OAuth 2.1 must be enabled and maintained (project config + consent page)
- Users need **Pro + synced highlights** for cloud MCP (unchanged)
- `workers.dev` URL may change perception of "production" until custom domain
- Consent page is required web-app work (Supabase redirects to our UI)

### Risks

| Risk | Mitigation |
|------|------------|
| Supabase DCR incompatible with ChatGPT | Spike in Phase 1; fall back to manual client registration, then Worker BFF (contingency) |
| Consent page session mismatch (extension vs web) | Web consent uses same Supabase project; document "sign in with same Google account" |
| Token refresh in long ChatGPT sessions | Rely on Supabase refresh tokens; worker returns `401` + `WWW-Authenticate` to trigger re-link |

## Explicit non-goals (v1)

- OAuth on extension bridge
- Basic/local highlights on cloud MCP
- Auth0 / WorkOS / Stytch as primary IdP
- Custom Worker-implemented authorization server (unless Supabase spike fails)
- Cloud MCP AI tools (`ask_scope`, `summarize_section`, `synthesize_domain`)

## References

- [ADR-023: MCP Server Architecture](./023-mcp-server-architecture.md)
- [Supabase OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server)
- [OpenAI Apps SDK — Authentication](https://developers.openai.com/apps-sdk/build/auth)
- [MCP Authorization Spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [packages/mcp-server/src/cloud/worker.ts](../../packages/mcp-server/src/cloud/worker.ts)
