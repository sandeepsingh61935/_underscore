# ADR-019: Rate-Limiting Strategy

**Status**: Accepted
**Date**: 2026-06-18
**Deciders**: Development Team

---

## Context

Two in-memory rate limiters exist in the extension:
- `src/shared/utils/rate-limiter.ts` (token bucket, used by `auth-manager.ts`).
- `src/background/sync/rate-limiter.ts` (token bucket, used by sync container).

Both are in-memory. SW restart wipes the count. An attacker can:
- Bypass auth brute-force by waiting 5 minutes for an SW restart (the user uses the extension, the SW unloads, the count resets).
- Reset sync throttling by triggering an SW unload mid-flood.

## Decision

- **Persist attempt counts** in `chrome.storage.local` keyed by rate-limiter name. Read on construction, write on every `tryAcquire`. Fail closed (return `false`) if `chrome.storage.local` is unavailable — better to block legitimate users briefly than to permit an attacker to bypass.
- **Do not** deduplicate the two limiters. The auth limiter is a brute-force defense (5/15min); the sync limiter is a back-pressure mechanism (100/min). Different shapes, different time scales, different lifecycle. Keep them parallel but share the persistent-state pattern.

## Consequences

- The `auth-manager.ts` rate limiter state survives service worker unloads.
- Brute-force resistance is more robust against SW lifecycle manipulation.
- If `chrome.storage.local` becomes unavailable or corrupt, users may be temporarily blocked from signing in (fail-closed security).
