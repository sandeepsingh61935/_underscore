# Web app + ChatGPT OAuth — post OAuth 2.1 enable checklist

## 1. Deploy web app (consent page)

From repo root:

```bash
npm run web:deploy
```

Note the preview URL (dev branch), e.g. `https://feature-mcp.underscore-web-3i0.pages.dev`

Production (when ready): `https://underscore-web-3i0.pages.dev` — deploy with `--branch=main`.

## 2. Supabase Dashboard → Authentication

### URL Configuration

| Field | Value |
|-------|--------|
| **Site URL** | `https://feature-mcp.underscore-web-3i0.pages.dev` (dev preview) |
| **Redirect URLs** | Add all of: |

```
https://feature-mcp.underscore-web-3i0.pages.dev/**
https://underscore-web-3i0.pages.dev/**
http://localhost:3000/**
https://cuzwaukxagefyvtxbqmi.supabase.co/auth/v1/callback
```

### OAuth Server

| Field | Value |
|-------|--------|
| **Authorization path** | `/oauth/consent` |
| **Dynamic client registration** | Enabled |

## 3. Google Cloud Console (if using Google sign-in on web)

Authorized redirect URIs must include Supabase callback:

```
https://cuzwaukxagefyvtxbqmi.supabase.co/auth/v1/callback
```

## 4. MCP worker (already deployed)

- URL: `https://underscore-mcp.sandeepss128961.workers.dev/mcp`
- Health: `curl .../health` → `"configured": true`

Optional stable resource URL:

```bash
cd packages/mcp-server
npx wrangler secret put MCP_RESOURCE_URL
# https://underscore-mcp.sandeepss128961.workers.dev
```

## 5. ChatGPT connector

1. Settings → Developer mode → Create app
2. **MCP URL:** `https://underscore-mcp.sandeepss128961.workers.dev/mcp`
3. **Auth:** OAuth
4. Complete flow → consent at `https://YOUR-PAGES-URL/oauth/consent`
5. Test: *"Call get_session on _underscore, then list my collections"*

## Verify consent page (production)

After deploy, sign in at your Pages URL, then OAuth flow will land on:

```
https://YOUR-PAGES-URL/oauth/consent?authorization_id=<real-id>
```

Do **not** use `authorization_id=TEST` in production.
