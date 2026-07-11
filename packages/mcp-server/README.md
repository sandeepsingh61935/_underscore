# @underscore/mcp-server

MCP server for [_underscore](https://github.com) highlights. Exposes library tools to Cursor, Claude Desktop, and any MCP client.

## Adapters

| Adapter | Command | Data coverage |
|---------|---------|---------------|
| **Bridge** (default) | `--adapter=bridge` | Full library via extension (`basic_local` / `pro_local`) |
| **Cloud** | `--adapter=cloud` | Pro cloud only (`pro_cloud`) via Supabase JWT |

Basic (on-device) highlights are **never** available on the cloud adapter.

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

### ChatGPT vs Cursor

| Client | Adapter | Auth | Basic highlights |
|--------|---------|------|------------------|
| **Cursor / Claude Desktop** | `--adapter=bridge` (stdio) | Extension token | Yes (local) |
| **ChatGPT** | Cloud worker (HTTPS) | Supabase JWT | No (Pro cloud only) |

## Cursor setup (bridge)

1. Build the server:

```bash
cd packages/mcp-server
npm install
npm run build
```

2. Generate a token (or set your own):

```bash
export UNDERSCORE_MCP_TOKEN="$(openssl rand -hex 24)"
echo $UNDERSCORE_MCP_TOKEN
```

3. Add to Cursor **mcp.json**:

```json
{
  "mcpServers": {
    "underscore": {
      "command": "node",
      "args": ["/absolute/path/to/_underscore/packages/mcp-server/dist/index.js", "--adapter=bridge"],
      "env": {
        "UNDERSCORE_MCP_TOKEN": "your-token-here"
      }
    }
  }
}
```

4. In the extension: **Settings → MCP Bridge** → Enable, paste the same token.

5. Restart Cursor MCP or open a new chat. Call `get_session` first.

## Cloud Worker (Pro only)

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

See [ADR-023](../../docs/04-adrs/023-mcp-server-architecture.md).
