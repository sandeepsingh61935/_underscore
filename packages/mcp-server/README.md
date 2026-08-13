# @underscore/mcp-server

MCP server for [_underscore](https://github.com) highlights. **Product path (ADR-029):** Cloud MCP on Cloudflare Workers. Agents see the **synced Pro cloud library** only (`dataCoverage: pro_cloud`).

Basic / guest highlights never appear on Cloud MCP. The local stdio **bridge** is compatibility-only and is not the Integrations setup path.

## Product path: Cloud Worker

| | |
|--|--|
| Transport | Streamable HTTP |
| URL | `https://YOUR-WORKER/mcp` |
| Auth | OAuth 2.1 (public hosts) or `Authorization: Bearer <supabase_access_token>` (scripts) |
| Gate | Signed-in **Paid** (past_due is rejected) |
| Data | Synced Supabase library (`pro_cloud`) |

### Remote MCP snippet (Cursor, Claude, Grok, …)

```json
{
  "mcpServers": {
    "underscore": {
      "url": "https://YOUR-WORKER/mcp"
    }
  }
}
```

Do **not** put `UNDERSCORE_MCP_TOKEN` or `--adapter=bridge` in product templates.

## ChatGPT setup (Pro cloud MCP)

ChatGPT does **not** support local stdio MCP. It requires a **public HTTPS** endpoint (Developer Mode app). Basic/guest users must **sign in to Pro** — cloud MCP reads your synced Supabase library only.

### Prerequisites

- ChatGPT **Pro, Team, Enterprise, or Edu** (Developer Mode)
- _underscore **Pro** account (signed in, highlights synced)
- Deployed cloud worker (see below)

### 1. Deploy the cloud worker

Run all commands **from `packages/mcp-server`** (this directory has `wrangler.toml` with `name = "underscore-mcp"`):

```bash
cd packages/mcp-server
npm install
npm run build
npm run worker:secret:url    # paste VITE_SUPABASE_URL from .env.development
npm run worker:secret:key    # paste VITE_SUPABASE_ANON_KEY from .env.development
npm run worker:deploy
```

Or explicitly pass the worker name if Wrangler still complains:

```bash
npx wrangler deploy --name underscore-mcp
npx wrangler secret put SUPABASE_URL --name underscore-mcp
```

After deploy, note the URL (e.g. `https://underscore-mcp.<your-subdomain>.workers.dev`).

Verify health:

```bash
curl https://underscore-mcp.<your-subdomain>.workers.dev/health
# {"ok":true,"service":"underscore-mcp"}
```

MCP endpoint: `https://underscore-mcp.<your-subdomain>.workers.dev/mcp`

### 2. Enable OAuth (ChatGPT)

ChatGPT requires MCP OAuth 2.1. Follow **[docs/OAUTH_SETUP.md](./docs/OAUTH_SETUP.md)**:

1. Enable **OAuth 2.1 server** in Supabase Dashboard (verified required — disabled projects return `feature_disabled`)
2. Deploy worker; verify `/.well-known/oauth-protected-resource`
3. Register ChatGPT client or enable DCR
4. Phase 2: web app `/oauth/consent` (not yet implemented)

### 3. Get a Supabase access token (dev / manual only)

Sign in to _underscore (extension or web). Your session JWT is required for RLS-scoped reads.

- **Extension**: use a logged-in Pro session (token is managed by Supabase auth).
- **Manual (dev)**: Supabase dashboard or `supabase auth` CLI — use the user's `access_token`.

The worker expects: `Authorization: Bearer <supabase_access_token>`.

### 3. Enable ChatGPT Developer Mode

1. Open [ChatGPT](https://chatgpt.com) → **Settings**
2. **Security & login** → turn on **Developer mode** (beta)

### 4. Create a developer-mode app

1. Go to **Settings → Apps** (or [chatgpt.com/plugins](https://chatgpt.com/plugins))
2. Click **Create** (developer-mode app)
3. Fill in:
   - **Name**: `_underscore`
   - **Description**: `Query and export your _underscore highlight library`
   - **MCP server URL**: `https://YOUR-WORKER/mcp` (HTTPS, Streamable HTTP)
4. Phase 2 consent page is live at `/oauth/consent` on the web app — ensure Supabase **Site URL** + **Authorization path** `/oauth/consent` match your deployment.

### 5. Test in chat

1. New chat → **+** → **Developer mode** → select your app
2. Prompt: *"Call get_session on _underscore, then list my highlight collections."*
3. Confirm `dataCoverage` is `pro_cloud`

### ChatGPT vs other hosts

| Client | Transport | Auth | Basic highlights |
|--------|-----------|------|------------------|
| **ChatGPT** | Cloud worker (HTTPS) | OAuth 2.1 | No (synced cloud only) |
| **Cursor / Claude / Grok** | Cloud worker (HTTPS) | OAuth or Bearer JWT | No (synced cloud only) |

## Cloud Worker (Paid only)

Deploy from **`packages/mcp-server`** (contains `wrangler.toml`):

```bash
cd packages/mcp-server
npm install
npm run worker:deploy
```

Set secrets first (from repo root `.env.development` values):

```bash
cd packages/mcp-server
npx wrangler secret put SUPABASE_URL      # paste VITE_SUPABASE_URL value when prompted
npx wrangler secret put SUPABASE_ANON_KEY  # paste VITE_SUPABASE_ANON_KEY value when prompted
npx wrangler secret list                  # verify both secrets exist
npm run worker:deploy
```

Check configuration: `curl .../health` returns `"configured": true` when secrets are set.

Legacy path `workers/mcp/wrangler.toml` forwards to the same entry — prefer `packages/mcp-server/wrangler.toml`.

Clients send `Authorization: Bearer <supabase_access_token>`.

## Tools

### All adapters
- `get_session` — mode, scope, auth, `dataCoverage`
- `list_collections`
- `get_highlights` — paginated
- `search_highlights`
- `export_highlights`

### Bridge only
- `sync_library`, `get_sync_status`
- `get_mode`, `set_mode`
- `update_highlight_metadata`
- `ask_scope`, `summarize_section`, `synthesize_domain` (requires `pro_xai`; context-only by default, `useOrchestrator: true` for extension LLM)

## Architecture

See [ADR-029](../../docs/04-adrs/029-cloud-first-library-and-integrations.md) (product path) and [ADR-023](../../docs/04-adrs/023-mcp-server-architecture.md) (dual-adapter code; bridge is compat).

## Legacy: local bridge (compat)

Stdio `--adapter=bridge` plus `UNDERSCORE_MCP_TOKEN` still exists for existing installs. It is **not** shown in Integrations UI and will be removed in a later epic. Do not add new bridge tools.
