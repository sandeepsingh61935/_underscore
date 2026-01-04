# Component 6: Real-Time Sync (WebSocket)

**Goal**: Implement real-time synchronization using Supabase Realtime (WebSockets) to ensure highlights appear on other devices within 3 seconds.

**Prerequisites**:
- [x] Valid Supabase credentials
- [x] `SupabaseClient` implemented (Component 2)
- [x] `EventBus` implemented (Component 1/Core)

## Task 6.1: Implement WebSocketClient
**Complexity**: High | **Duration**: 8 hours | **Tests**: 15 Integration

- [x] Create `IWebSocketClient` interface
  - `subscribe(userId: string): Promise<void>`
  - `unsubscribe(): void`
  - `isConnected(): boolean`
- [x] Implement `WebSocketClient` class
  - [x] Constructor (inject SupabaseClient, EventBus, Logger)
  - [x] Implement `subscribe(userId)` method
    - [x] Create Supabase channel ('highlights')
    - [x] Bind to `postgres_changes` event (INSERT, UPDATE, DELETE)
    - [x] Filter by `user_id=eq.{userId}`
  - [x] Implement event handlers
    - [x] `INSERT` -> Emit `REMOTE_HIGHLIGHT_CREATED`
    - [x] `UPDATE` -> Emit `REMOTE_HIGHLIGHT_UPDATED`
    - [x] `DELETE` -> Emit `REMOTE_HIGHLIGHT_DELETED`
  - [x] Implement status logging (subscribe callback)
  - [x] Implement cleanup/unsubscribe logic
- [x] Integration Tests
  - [x] Successful connection establishes subscription
  - [x] INSERT event emits `REMOTE_HIGHLIGHT_CREATED`
  - [x] UPDATE event emits `REMOTE_HIGHLIGHT_UPDATED`
  - [x] DELETE event emits `REMOTE_HIGHLIGHT_DELETED`
  - [x] Reconnection logic works after disconnect
  - [x] Multiple subscriptions handled gracefully
  - [x] Connection error handling
  - [x] Correct payload mapping

## Task 6.2: Implement ConnectionManager
**Complexity**: Medium | **Duration**: 4 hours | **Tests**: 8 Unit

- [x] Implement `ConnectionManager` class
  - [x] Constructor (inject WebSocketClient, Logger)
  - [x] Implement `connect()` with retry logic
  - [x] Implement `handleReconnect()` with exponential backoff
    - [x] Max attempts: 5
    - [x] Delay: 1s, 2s, 4s, 8s, 16s (max 30s)
  - [x] Reset retry counter on successful connection
  - [x] Listen for network status changes (online/offline)
- [x] Unit Tests
  - [x] Successful connection resets retry counter
  - [x] Failed connection triggers reconnect
  - [x] Exponential backoff delays are correct
  - [x] Max attempts stops reconnection
  - [x] Manual disconnect does not trigger reconnect
  - [x] Network change (offline -> online) triggers reconnect

## Task 6.3: DI & Integration
- [x] Register `WebSocketClient` in DI container
- [x] Register `ConnectionManager` in DI container
- [x] Initialize `ConnectionManager` on app start (background service)

## Verification
- [x] Run full test suite for Component 6: `npm test src/background/realtime`
- [x] Verify manual offline/online behavior
