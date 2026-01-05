# Authentication Integration Technical Reference

> [!NOTE]
> This document details the technical implementation of Supabase GoTrue authentication in the `_underscore` extension, completed during Phase 2 (Vault Mode).

## 1. Overview

The goal of this integration was to replace the mock authentication system with a robust, production-ready solution using **Supabase GoTrue**. This enables:
- **Real OAuth Flows**: Secure sign-in via Google (and other providers).
- **Persistent Sessions**: Encrypted session storage using `AES-GCM` and `chrome.storage.local`.
- **Reactive UI**: Immediate UI updates across Popup, Content Scripts, and Background Service Worker upon auth state changes.
- **Secure Persistence**: Protection of access tokens using client-side encryption.

## 2. Architecture

The authentication system is built on a **Layered Architecture** leveraging Dependency Injection (DI) for testability and modularity.

### 2.1 Core Components

| Component | Responsibility | Location |
| :--- | :--- | :--- |
| **`AuthManager`** | Central facade for all auth operations. Wraps `SupabaseSDK` and manages state. | `src/background/auth/auth-manager.ts` |
| **`SupabaseStorageAdapter`** | Implements Supabase's `SupportedStorage` interface. Encryption/decryption logic. | `src/background/auth/supabase-storage-adapter.ts` |
| **`KeyManager`** | Manages encryption keys (`RSA-OAEP` / `AES-GCM`) for session encryption. | `src/background/auth/key-manager.ts` |
| **`ChromeMessageBus`** | Handles IPC (Inter-Process Communication) between Popup and Background. | `src/shared/services/chrome-message-bus.ts` |
| **`PopupStateManager`** | Manages UI state in the popup, including Auth status. | `src/popup/popup-state-manager.ts` |
| **`PopupController`** | Handles DOM events (Login/Logout clicks) and updates the view. | `src/popup/popup-controller.ts` |

### 2.2 Data Flow: Login

1.  **User Action**: User clicks "Sign In" in Popup.
2.  **IPC Request**: `PopupController` sends `LOGIN` message via `MessageBus`.
3.  **Background Handler**: `background.ts` receives `LOGIN` and calls `AuthManager.signIn()`.
4.  **Supabase Auth**: `AuthManager` triggers `supabase.auth.signInWithOAuth()`.
5.  **Chrome Identity**: Supabase SDK (via polyfill/adapter) uses `chrome.identity.launchWebAuthFlow` to open the provider's OAuth page.
6.  **Session Creation**: On success, Supabase returns a session.
7.  **Encryption**: `SupabaseStorageAdapter` encrypts the session (Access/Refresh Tokens) using `KeyManager`.
8.  **Persistence**: Encrypted session is stored in `chrome.storage.local`.
9.  **State Broadcast**: `AuthManager` emits `AUTH_STATE_CHANGED`. Background broadcasts this to Popup/Content via `MessageBus`.

## 3. Implementation Details

### 3.1 Secure Session Storage (`SupabaseStorageAdapter`)

We do **not** store raw tokens in `localStorage` or `cookies`. Instead, we implemented a custom adapter:

```typescript
export class SupabaseStorageAdapter implements SupportedStorage {
  async setItem(key: string, value: string): Promise<void> {
    // 1. Encrypt value using KeyManager (AES-GCM)
    const encrypted = await TokenEncryption.encrypt(value, keyManager);
    // 2. Store in chrome.storage.local
    await chrome.storage.local.set({ [key]: encrypted });
  }

  async getItem(key: string): Promise<string | null> {
    // 1. Fetch from chrome.storage.local
    const stored = await chrome.storage.local.get(key);
    // 2. Decrypt using KeyManager
    return TokenEncryption.decrypt(stored[key], keyManager);
  }
}
```

### 3.2 IPC & Message Bus Improvements

To support the Request/Response pattern required for Login (where we need to know if it succeeded or failed immediately), we enhanced `ChromeMessageBus`:

-   **Async Response Support**: Fixed `chrome.runtime.onMessage` handler to return `true` to keep the channel open for async operations.
-   **Subscription Model**: Switched from a custom `.on()` event emitter pattern to a standard `.subscribe()` pattern in `background.ts` to prevent runtime errors.

### 3.3 UI Integration (Finnish Material Design)

The Auth UI was integrated into `popup.html` following the **Finnish Material Design** system:
-   **Header Integration**: Auth controls are placed in the header for easy access.
-   **Dynamic State**:
    -   *Logged Out*: Shows a clean "Sign In" button (Ice Blue accent).
    -   *Logged In*: Shows User Avatar and Name with a refined Logout (✖) button.
-   **Optimistic Updates**: UI updates immediately via `PopupStateManager` while the background processes the request.

## 4. Security Considerations

-   **Token Encryption**: All persisted tokens are encrypted at rest.
-   **Non-Blocking Init**: Background initialization uses non-blocking connection logic (`void connectionManager.connect()`) to prevent startup hangs, ensuring the extension is always responsive even if network is slow.
-   **Error Handling**: Both Popup and Background implement robust error handling (Circuit Breakers in messaging, try/catch in listeners) to prevent UI crashes ("Receiving end does not exist" handled gracefully).

## 5. Future Improvements

-   **Session Refresh**: Ensure `Auto-Refresh` logic in `AuthManager` is robust against wake/sleep cycles of the browser.
-   **Profile Editing**: Allow users to update their profile directly from the extension (currently read-only from OAuth provider).

---

> [!TIP]
> **Debugging**: If you encounter connection issues, check the **Background Console** for "Message handler error" or "Initialization failed" logs. `bootstrap.ts` logs are the source of truth for startup sequence.
