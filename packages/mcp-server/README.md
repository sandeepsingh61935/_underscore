# @underscore/mcp-server

MCP server for [_underscore](https://github.com) highlights. **Product path (ADR-029):** Cloud MCP on Cloudflare Workers. Agents see the **synced Pro cloud library** only (`dataCoverage: pro_cloud`).

Basic / guest highlights never appear on Cloud MCP. The local stdio **bridge** has been removed (`--adapter=bridge` errors). Use the Worker URL + OAuth or Bearer JWT.

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

## MCP Capabilities

### 1. Highlight & Knowledge Query Tools
- `get_session` — Returns session auth, mode, storage scope, capabilities, and `dataCoverage`.
- `list_collections` — List highlight collections grouped by domain with item counts.
- `get_highlights` — Paginated highlights for a specific domain.
- `get_recent_highlights` — Reverse chronological highlights with optional `sinceDays` filter.
- `get_page_highlights` — Get highlights and annotations for an exact URL / webpage.
- `get_related_highlights` — Relevance-scored highlights matching a query across all domains.
- `search_highlights` — Full-text search across highlight text, notes, tags, and URLs.
- `list_tags` — List all user tags across the library with usage counts.
- `get_highlights_by_tag` — Filter highlights by tag name.
- `export_highlights` — Export library or domain highlights as Markdown.

### 2. Notes & Marginalia Tools
- `get_highlights_with_notes` — Get only highlights where you wrote personal reflections or marginalia.
- `search_notes` — Search specifically within your personal notes and reflections.
- `get_highlight_note` — Get the full note, marginalia, and metadata for a specific highlight ID.
- `export_notes_digest` — Export a curated Markdown digest of quotes paired with your personal notes.

### 3. ChatGPT Connector Compatibility Tools
- `search` — Standard OpenAI Apps SDK search tool.
- `fetch` — Standard OpenAI Apps SDK fetch tool for individual highlights.

### 4. Native MCP Resources
Direct context streaming for Claude Desktop, Cursor, and MCP clients:
- `underscore://recent` — Live stream of the latest 20 highlights from your library.
- `underscore://collections` — Directory of all highlighted domains and counts.
- `underscore://notes` — Stream of all highlights containing user-written notes.

### 5. Native MCP Prompt Templates
Appears in agent slash-command / prompt menus:
- `summarize_domain` (`domain`) — Synthesize all highlights from a website into key takeaways.
- `review_recent_reading` (`days`) — Synthesize recently captured highlights and notes by topic.

## Registry & Configuration

- **Smithery.ai**: Configured via [`smithery.yaml`](../../smithery.yaml) with automatic OAuth and HTTP streaming transport.
- **Glama.ai / Open MCP**: Registered as `underscore` with standard OpenID Connect discovery.

## Architecture

See [ADR-029](../../docs/04-adrs/029-cloud-first-library-and-integrations.md) (product path), [ADR-023](../../docs/04-adrs/023-mcp-server-architecture.md) (MCP server architecture), and [ADR-024](../../docs/04-adrs/024-mcp-cloud-oauth.md) (OAuth 2.1 authentication).
