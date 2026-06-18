# ADR-018: Vault Unlock UI — User-Facing Passphrase Prompt

**Status**: Accepted
**Date**: 2026-06-18
**Deciders**: Development Team

---

## Context

ADR-012 (commit `5d31650`, "refactor(auth): derive master key from user passphrase per ADR-012") shipped PBKDF2 over a user-supplied passphrase as the input to the master key that encrypts every user's RSA private key. The cryptographic side of the change is complete: `KeyManager.unlock(userId, passphrase)` derives a per-user AES-GCM master key from a per-user salt, wipes the input string, and caches the CryptoKey in service-worker memory until `lock()` is called or the worker restarts.

The UI side of that change is missing. There is no prompt that asks the user to enter their vault passphrase, and the only caller of `KeyManager.unlock()` is a no-op bootstrap on first login. The result is a recoverable deadlock:

- Every MV3 service-worker restart wipes the in-memory master key (`key-manager.ts:142-149`).
- Without a UI to re-enter the passphrase, the user has no way to unlock the vault after the first restart.
- Vault-gated features — encrypted highlight text decryption, cloud-sync encryption, future E2E exports — are silently broken in a way that surfaces only on the next SW restart.

`src/entrypoints/background.ts` already wires up GET_AUTH_STATE / LOGIN / LOGOUT handlers but no IPC channel for vault unlock exists. `src/shared/schemas/message-schemas.ts` defines `IPC_HIGHLIGHT_*` constants (ADR-013) but no `IPC_VAULT_*` constant.

### Why now

The Stage 2 work (ADR-012) is functionally complete in the cryptographic layer; the unlock prompt is the user-facing follow-up that closes the loop. Without it, the security upgrade from hardcoded constants to PBKDF2 over a passphrase has no UX-side counterpart — the user's encrypted data is just as inaccessible as before.

---

## Decision

Ship the missing UI side as a thin IPC + hook + view + popup-routing change, mirroring the existing `LOGIN` / `LOGIN_EMAIL` patterns in `useCurrentUser` and the `IPC_HIGHLIGHT_*` channel pattern from ADR-013.

### IPC channel `IPC_VAULT_UNLOCK`

- **Payload**: `{ passphrase: string }`
- **Success**: `{ success: true, data: { keyId: string } }` where `keyId` is `${user.id}_unlocked` (matches the format the rest of the vault code uses for derived keys).
- **Failure**: `{ success: false, error: string, code: 'VAULT_LOCKED' | 'INVALID_PASSPHRASE' | 'DEPRECATED_FORMAT' | 'NOT_AUTHENTICATED' }`

The background handler in `src/entrypoints/background.ts`:

1. Resolves `IKeyManager` from the DI container.
2. Reads the authenticated user via `authManager.getAuthState().user`. If absent, returns `NOT_AUTHENTICATED` (no point deriving a key for a user we don't have a session for).
3. Calls `keyManager.unlock(user.id, payload.passphrase)`.
4. Maps thrown errors to codes by string matching on the error message: `deprecated` -> `DEPRECATED_FORMAT`, `locked` -> `VAULT_LOCKED`, anything else (the common case: wrong passphrase / PBKDF2 mismatch) -> `INVALID_PASSPHRASE`.

### Hook `useUnlockVault`

Lives in `src/features/auth/hooks/useUnlockVault.ts`. Follows the `useIpcAction` pattern (ADR-009). Returns:

```ts
{
  unlock(passphrase: string): Promise<{ success: boolean; error?: string }>;
  isUnlocking: boolean;
  error: string | null;
  vaultStatus: 'unknown' | 'locked' | 'unlocked';
}
```

`vaultStatus` starts at `'unknown'` in the extension context and `'locked'` in non-extension contexts (web app). It transitions to `'unlocked'` on success and to `'locked'` on any IPC failure. This matches the lifetime of the in-memory master key.

### View `UnlockVaultView`

Lives in `src/entrypoints/popup/views/UnlockVaultView.tsx`. V2 Editorial styling, body-only root per the V2 popup chrome contract (`PopupShell` owns the 400x600 chrome).

- Single accent terracotta (`var(--accent)`) for the error state; matches `AuthView`'s error treatment.
- 44px minimum touch targets on every interactive element.
- `var(--paper)` / `var(--ink)` / `var(--rule)` for surfaces and borders.
- `.u-serif` heading, `.u-sans` body, `.u-mono` label.
- Props: `onUnlock(passphrase)`, `onUnlockSuccess()`, `onCancel()`, optional `isUnlocking`. The view does not call IPC; it delegates to `useUnlockVault` (which lives in the popup entry, not the view) per the ADR-009 boundary.

### V2 popup chrome entry `UNLOCK_VAULT`

`src/entrypoints/popup/chrome.ts`:

- Adds `'UNLOCK_VAULT'` to the `ViewKey` union.
- Adds a `buildChrome` entry: title `_underscore · vault`, `showTitleStrip: true`, `showModeHeader: true`, `showTabBar: false`, `modeId: handlers.getModeId()`, `onSwitch: handlers.onSwitch`. The mode header is on so the user can see the active mode (cloud/ai) and switch back to local/ephemeral without re-entering the unlock flow.

### Popup routing

`src/entrypoints/popup/index.tsx`:

- Adds `UNLOCK_VAULT = 'UNLOCK_VAULT'` to the `enum View` block.
- After `handleLoginSuccess` (OAuth/email), branches on `targetMode`: cloud/ai routes to `UNLOCK_VAULT`, everything else routes to `COLLECTIONS`.
- Adds `handleUnlockSuccess` (-> `COLLECTIONS`) and `handleUnlockCancel` (-> `MODE_SELECTION`).
- Calls `useUnlockVault()` inside `PopupApp()` and wires the result into the new render branch.

The decision to skip `UNLOCK_VAULT` for non-cloud/ai modes (ephemeral, local) is deliberate: those modes do not require a vault master key. Forcing the prompt on a user who selected "ephemeral" would be hostile.

---

## Consequences

### Positive

- **Closes the UI side of ADR-012.** Vault-gated features are reachable again after the first SW restart, instead of silently breaking.
- **One IPC surface for unlock.** Future improvements (rate-limited retries, biometric unlock, "remember me" within an SW lifetime) plug in behind the same channel without touching the view.
- **Mirrors the existing auth IPC pattern.** A developer who knows `LOGIN` / `LOGIN_EMAIL` already knows `IPC_VAULT_UNLOCK`. The error code envelope matches the wire format used elsewhere in the system.
- **View is body-only.** No width/height declarations, no `position: absolute` motion wrapper. `PopupShell` keeps ownership of the chrome and the single `AnimatePresence` (per the V2 popup chrome contract enforced 2026-06-03).

### Negative

- **A new IPC channel to maintain.** Adding channels to `message-schemas.ts` has historically led to typo-driven mismatches (the reason `IPC_HIGHLIGHT_*` was centralized in the first place). Mitigation: a single `IPC_VAULT_UNLOCK` constant is added in the same place as the others; both background and view import it via the schema module.
- **Passphrase lives in the popup's React state.** It is held as a `useState` string for the lifetime of the unlock attempt. The background wipes it on derivation (PBKDF2 consumes the string by value), but the popup keeps it in component state until the next keystroke clears it. Mitigation: the `useState` lives in `UnlockVaultView` and is dropped when the view unmounts (routing away clears it automatically).
- **The string-match error code mapping is brittle.** It depends on `KeyManager.unlock()` continuing to throw messages containing `'deprecated'` or `'locked'`. If those messages are reworded, the codes silently degrade to `INVALID_PASSPHRASE`. Acceptable for now; a typed `VaultError` class is a natural follow-up.

### Neutral

- The `useCurrentUser` hook is untouched. Auth state and vault state are intentionally separate: the user is "signed in" before they unlock the vault, and signed out / vault-locked are independent transitions.
- The `KeyManager.unlock()` API is untouched. The IPC handler is the thinnest possible wrapper.

---

## Alternatives Considered

### Alternative 1: Prompt inside `AuthView`, no separate view

Have the existing `AuthView` accept an optional "unlock after login" step and route the user back through it. Rejected: `AuthView` is sign-in / sign-up only; mixing it with the vault unlock step would conflate two distinct user states (signed-out vs. vault-locked) and would complicate `AuthView`'s tests.

### Alternative 2: Auto-unlock on first sign-in, never prompt again

Skip the prompt entirely and derive the master key from a value the popup already has (e.g. the auth token). Rejected: that recreates the exact problem ADR-012 was written to fix — the master key would still be derivable from a value the bundle exposes. The whole point of PBKDF2 over a passphrase is that the passphrase is *not* derivable from anything the bundle has.

### Alternative 3: Lock the vault behind a settings page

Add a "Vault" entry in `Settings` that opens the unlock prompt. Rejected: the user reaches the prompt *after* sign-in, and the natural entry point is the post-login flow, not the settings page. Routing through settings would add a click and a context switch for the common case.

### Alternative 4: Reuse `IPC_HIGHLIGHT_DECRYPT_TEXT` for the unlock call

The decrypt channel already crosses the encryption boundary. Rejected: it expects ciphertext, not a passphrase. Conflating the two would require reworking the decrypt path's payload shape and would couple two unrelated operations.

---

## Implementation Notes

### Files affected

- **Create**: `docs/04-adrs/018-vault-unlock-ui.md` (this file).
- **Create**: `src/features/auth/hooks/useUnlockVault.ts` — hook.
- **Create**: `src/features/auth/hooks/useUnlockVault.test.ts` — 5 tests (sends IPC, sets `vaultStatus='unlocked'`, sets `vaultStatus='locked'` + error on `INVALID_PASSPHRASE`, exposes `isUnlocking=true` in flight, returns `vaultStatus='locked'` when no chrome.runtime).
- **Create**: `src/entrypoints/popup/views/UnlockVaultView.tsx` — V2 view.
- **Create**: `src/entrypoints/popup/views/UnlockVaultView.test.tsx` — 5 tests (renders input + button, calls `onUnlock(passphrase)`, disables button while `isUnlocking`, calls `onCancel` on back, surfaces error).
- **Modify**: `src/shared/schemas/message-schemas.ts` — add `IPC_VAULT_UNLOCK` constant alongside the existing `IPC_HIGHLIGHT_*` block.
- **Modify**: `src/entrypoints/background.ts` — add the `IPC_VAULT_UNLOCK` handler after `GET_AUTH_STATE`; import `IKeyManager` from the auth interfaces module.
- **Modify**: `src/entrypoints/popup/chrome.ts` — add `'UNLOCK_VAULT'` to `ViewKey`; add `buildChrome` entry.
- **Modify**: `src/entrypoints/popup/chrome.test.ts` — add a test for the `UNLOCK_VAULT` chrome entry.
- **Modify**: `src/entrypoints/popup/index.tsx` — add `UNLOCK_VAULT` to the `enum View` block; branch `handleLoginSuccess` on target mode; add `handleUnlockSuccess` / `handleUnlockCancel`; call `useUnlockVault()`; add the render branch.

### TDD sequence (followed)

1. Failing test for `useUnlockVault` -> implement hook -> 5/5 pass.
2. Failing test for `UnlockVaultView` -> implement view -> 5/5 pass.
3. `chrome.ts` change -> `chrome.test.ts` test -> 13/13 pass.
4. `background.ts` handler + `index.tsx` routing wired last; the existing test suites for the surrounding files are unchanged.

### Verification

- `npm test -- --run src/features/auth/hooks/useUnlockVault.test.ts src/entrypoints/popup/views/UnlockVaultView.test.tsx src/entrypoints/popup/chrome.test.ts` — all 23 tests pass.
- `npm run type-check` — no new errors. Pre-existing 313 deferred errors are out of scope per the project's TSC cleanup backlog.

### Out of scope (deferred)

- Typed `VaultError` class to replace string-match error code mapping.
- "Forgot passphrase" / vault reset flow. The current `DEPRECATED_FORMAT` code signals the user that a reset is required, but the actual reset UI is a separate task.
- Rate-limiting on `IPC_VAULT_UNLOCK` (covered by the ADR-019 follow-up: Task 3.2).

---

## References

- ADR-012: Master key derived from user passphrase via PBKDF2 (parent decision)
- ADR-013: Encryption boundary on the background side (defines the in-memory master key lifetime this ADR inherits)
- ADR-009: `useIpcAction` generic hook (the pattern `useUnlockVault` follows)
- ADR-011: `IPC_HIGHLIGHT_BATCH_ADD_MANY` (the pattern the `IPC_VAULT_UNLOCK` constant follows in `message-schemas.ts`)
- `src/background/auth/key-manager.ts:72-120` — `unlock()` implementation this UI side wraps
- `src/features/auth/hooks/useCurrentUser.ts` — sibling hook that uses the same `useIpcAction` pattern

---

## Revision History

| Date       | Author | Changes      |
| ---------- | ------ | ------------ |
| 2026-06-18 | Claude | Initial draft |
