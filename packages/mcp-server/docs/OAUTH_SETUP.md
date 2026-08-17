# MCP Cloud OAuth Setup (Phase 1)

Step-by-step setup for ChatGPT and other MCP OAuth clients. See [ADR-024](../../../docs/04-adrs/024-mcp-cloud-oauth.md).

## Verified project state (dev)

| Check | Command / location | Expected |
|-------|-------------------|----------|
| Supabase OIDC discovery | `curl $SUPABASE_URL/auth/v1/.well-known/openid-configuration` | HTTP 200, `issuer` ends with `/auth/v1` |
| OAuth 2.1 server | Same project, Dashboard → Authentication → OAuth Server | **Must be enabled** (returns `feature_disabled` until on) |
| Worker secrets | `npx wrangler secret list` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| Protected resource | `curl https://YOUR-WORKER/.well-known/oauth-protected-resource` | JSON with `authorization_servers` |
| Unauthorized MCP | `curl -i https://YOUR-WORKER/mcp` | HTTP 401 + `WWW-Authenticate` header |

## 1. Enable Supabase OAuth 2.1 server

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **OAuth Server** (under Manage)
3. Enable **OAuth 2.1 server**
4. Set **Authorization path** to `/oauth/consent` (path only — combined with Site URL)
5. Set **Site URL** to your deployed web app (pick one canonical host):
   - Production (resume): `https://underscore-web.vercel.app`
   - Cloudflare Pages: `https://underscore-web-3i0.pages.dev`
   - Local: `http://localhost:3000`
6. **Redirect URLs:** add `https://underscore-web.vercel.app/**`, `https://underscore-web-3i0.pages.dev/**`, `http://localhost:3000/**`, and Supabase callback
   - Do **not** use retired branch previews (e.g. `feature-mcp.*.pages.dev`) — those deployments are deleted.
7. Enable **Dynamic client registration** when testing ChatGPT (allows DCR)

Until enabled, discovery returns:

```json
{"error_code":"feature_disabled","msg":"OAuth server is disabled"}
```

## 2. Deploy worker (if not already)

```bash
cd packages/mcp-server
npm run worker:deploy
```

Optional stable resource URL (recommended before ChatGPT connector):

```bash
npx wrangler secret put MCP_RESOURCE_URL
# paste: https://underscore-mcp.YOUR-SUBDOMAIN.workers.dev
```

## 3. Verify worker OAuth metadata

```bash
WORKER=https://underscore-mcp.YOUR-SUBDOMAIN.workers.dev

curl -sS "$WORKER/health" | jq .
curl -sS "$WORKER/.well-known/oauth-protected-resource" | jq .
curl -sS -i -X POST "$WORKER/mcp" | head -20
```

Expected `/health` oauth block:

```json
{
  "oauth": {
    "protectedResource": "https://.../.well-known/oauth-protected-resource",
    "authorizationServer": "https://PROJECT.supabase.co/auth/v1",
    "scopes": ["openid", "email", "profile"]
  }
}
```

## 4. Register ChatGPT OAuth client (manual, before DCR)

1. Supabase Dashboard → **Authentication** → **OAuth Apps** → **Add new client**
2. **Name:** `ChatGPT MCP`
3. **Type:** Public (PKCE, no client secret)
4. **Redirect URIs:** use ChatGPT’s callback URL from the connector setup UI (copy exactly when prompted)
5. **Token endpoint auth method:** `none`

Alternatively enable **Dynamic client registration** and skip manual registration.

## 5. ChatGPT connector

1. ChatGPT → Settings → Developer mode → Create connector
2. **MCP URL:** `https://YOUR-WORKER/mcp`
3. **Auth:** OAuth (ChatGPT discovers metadata from worker `401` / protected-resource document)
4. Complete sign-in → approve consent at `https://underscore-web.vercel.app/oauth/consent` (or your Site URL + `/oauth/consent`)

## 6. Dev fallback (Bearer JWT)

Manual Bearer tokens still work for curl and scripts:

```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -X POST .../mcp ...
```

## Phase 2 (implemented)

- Web consent: `src/features/oauth/views/OAuthConsentPage.tsx` at `/oauth/consent`
- Connected apps: Settings → **Connected apps** (revoke via Supabase `listGrants` / `revokeGrant`)
- After Google sign-in, user returns to consent via `returnTo` query param

Ensure Supabase **Site URL** + **Authorization path** `/oauth/consent` match your deployed web app.
