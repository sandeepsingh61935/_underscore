# ADR-023: MCP Server Architecture

## Status

Accepted (2026-07-11)

Amended by [ADR-029](./029-cloud-first-library-and-integrations.md): Cloud MCP is the product Integrations path; the local stdio bridge is removed.

## Context

_underscore needs a Model Context Protocol (MCP) surface so external AI clients (Cursor, Claude Desktop, any LLM provider) can read and act on user highlights without per-provider integrations.

The app uses v3 modes (`basic`, `pro`, `pro_xai`) and auth-scoped storage (`underscore_basic` vs `underscore_pro` IndexedDB). Basic highlights never sync to Supabase. MV3 service workers cannot bind TCP ports.

## Decision

Ship a **dual-adapter MCP server** in `packages/mcp-server/` with a shared tool layer:

| Adapter | Transport | Data coverage |
|---------|-----------|---------------|
| **Extension bridge** | stdio (Cursor) + WebSocket server on `127.0.0.1:17342` | `basic_local` or `pro_local` — full library |
| **Cloud** | Streamable HTTP on Cloudflare Workers (free tier) | `pro_cloud` only — authenticated Supabase RLS |

### Bridge security

- Fixed port `17342`, single extension profile assumed
- Per-session random token required on WebSocket connect
- Extension connects **outbound** to MCP Node process (not SW-hosted HTTP)
- Settings panel: enable toggle + token field + connection status

### Toolsets

| Toolset | Notes |
|---------|-------|
| `context` | `get_session` with `mode`, `storageScope`, `capabilities`, `dataCoverage` |
| `library` | Paginated reads; scope tags on results |
| `export` | Markdown via shared `highlight-export` |
| `ai` | Gated on `pro_xai`; context-only default; `useOrchestrator` opt-in on bridge |
| `sync` | Bridge only: `sync_library`, `get_sync_status` |
| `mode` | v3 vocabulary; mirrors `usePersistedMode` auth rules |
| `settings` | `get_basic_ttl` / `set_basic_ttl` (Basic scope only) |

### Explicit non-goals

- Basic highlights in cloud MCP (never)
- Legacy mode names in tool schemas (`ephemeral`, `cloud`, etc.) — normalize at input only
- LLM API keys exposed via MCP

## Consequences

- Two deployment configs (local `mcp.json` + remote Worker URL)
- Extension must stay running for bridge adapter
- Cloud MCP users see encrypted text unless vault unlocked in extension
- Phase 2: Native Messaging Host for auto token pairing (optional)
- Phase 2: Cloud MCP OAuth for ChatGPT — see [ADR-024](./024-mcp-cloud-oauth.md)

## References

- [mode-state-schemas.ts](../../src/shared/schemas/mode-state-schemas.ts)
- [highlight-storage-scope.ts](../../src/shared/constants/highlight-storage-scope.ts)
- [mcp-bridge.ts](../../src/shared/constants/mcp-bridge.ts)
