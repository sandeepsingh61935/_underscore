# Vault Mode Phase 2: Component-Based Implementation Plan (v3.0 - Security Enhanced)

**Version**: 3.0 - Security + Scalability  
**Date**: 2026-01-03  
**Prerequisites**: Vault Mode Phase 1 (Local IndexedDB) Complete ✅  
**Duration**: 7.5 weeks  
**Architecture Compliance**: SOLID, Event Sourcing (ADR-001), Event-Driven (ADR-002), Security Requirements

---

## Document Overview

This document breaks down Vault Mode Phase 2 into **7 components** with comprehensive tasks that strictly follow:

1. **Event Sourcing** (ADR-001): All sync via immutable event log
2. **Event-Driven Architecture** (ADR-002): EventBus for component communication
3. **SOLID Principles**: SRP, OCP, LSP, ISP, DIP
4. **System Design Patterns**: Strategy, Factory, Repository, DI
5. **Testing Strategy v2**: Risk-based, realistic edge cases, minimal mocking
6. **Security Requirements**: E2E encryption, input sanitization, rate limiting
7. **Scalability**: Pagination, caching, resource pooling

---

## What's New in v3.0

### Security Enhancements (+ 68 tests)
- ✅ **E2E Encryption**: User data encrypted before sending to Supabase
- ✅ **Secure Key Management**: Keypair generation and storage
- ✅ **Input Sanitization**: DOMPurify integration for XSS protection
- ✅ **Rate Limiting**: Token bucket for API and sync operations
- ✅ **HTTPS Enforcement**: Validation of secure connections
- ✅ **CSP Verification**: Content Security Policy for OAuth
- ✅ **Audit Logging**: Security event tracking
- ✅ **API Key Protection Prep**: Infrastructure for future Gen Mode

### Scalability Enhancements (+  tests)
- ✅ **Pagination**: Cursor-based pagination for large datasets
- ✅ **Caching**: LRU cache for sync responses
- ✅ **Resource Pooling**: WebSocket connection pooling
- ✅ **Rate Limiting**: Prevents API abuse and DoS

### Timeline Update
- **Original**: 6 weeks, 244 tests
- **Updated**: 7.5 weeks, 312 tests (+10 days, +68 tests)

---

## Component Architecture

```
┌────────────────────────────────────────────────────────────┐
│          VAULT MODE PHASE 2 COMPONENTS (v3.0)               │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  C1: Authentication & Security Layer                 │  │
│  │   - AuthManager                                      │  │
│  │   - TokenStore (AES-256-GCM encryption)              │  │
│  │   - E2EEncryptionService (NEW)                       │  │
│  │   - KeyManager (NEW)                                 │  │
│  │   - AuditLogger (NEW)                                │  │
│  │   - CSPValidator (NEW)                               │  │
│  │   - AuthStateObserver                                │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C2: API Client Layer + Scalability                  │  │
│  │   - SupabaseClient                                   │  │
│  │   - PaginationClient (NEW - cursor-based)            │  │
│  │   - CacheManager (NEW - LRU)                         │  │
│  │   - HTTPSValidator (NEW)                             │  │
│  │   - RetryDecorator (reuse from IPC)                  │  │
│  │   - CircuitBreaker (reuse from IPC)                  │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C3: Event Sourcing + Input Validation              │  │
│  │   - EventStore (IndexedDB)                           │  │
│  │   - EventPublisher                                   │  │
│  │   - EventReplayer                                    │  │
│  │   - InputSanitizer (NEW - DOMPurify)                 │  │
│  │   - EventValidator (NEW)                             │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C4: Sync Engine + Rate Limiting                     │  │
│  │   - SyncQueue                                        │  │
│  │   - SyncBatcher                                      │  │
│  │   - RateLimiter (NEW - token bucket)                 │  │
│  │   - OfflineQueue                                     │  │
│  │   - NetworkDetector                                  │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C5: Conflict Resolution                             │  │
│  │   - VectorClockManager                               │  │
│  │   - ConflictDetector                                 │  │
│  │   - ConflictResolver                                 │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C6: Real-Time Sync + Resource Pooling              │  │
│  │   - WebSocketClient                                  │  │
│  │   - ConnectionPool (NEW)                             │  │
│  │   - RealtimeSubscription                             │  │
│  │   - ConnectionManager                                │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C7: Migration Service                               │  │
│  │   - LocalToCloudMigrator                             │  │
│  │   - MigrationValidator                               │  │
│  │   - RollbackService                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## Component 1: Authentication & Security Layer

### Overview
Handles user authentication using Supabase GoTrue with OAuth providers (Google, Apple, Facebook, Twitter), plus **E2E encryption, secure key management, audit logging, and CSP validation**.

### Architecture Principles
- **SRP**: Each class has single responsibility
- **DIP**: Depend on interfaces
- **Event-Driven**: Emit auth state changes via EventBus
- **Security**: Defense in depth (encryption at rest, in transit, audit trail)

### Files to Create

```
src/background/auth/
├── interfaces/
│   ├── i-auth-manager.ts
│   ├── i-token-store.ts
│   ├── i-encryption-service.ts        # NEW
│   ├── i-key-manager.ts                # NEW
│   └── i-audit-logger.ts               # NEW
├── auth-manager.ts
├── token-store.ts
├── e2e-encryption-service.ts           # NEW
├── key-manager.ts                      # NEW
├── audit-logger.ts                     # NEW
├── csp-validator.ts                    # NEW
├── auth-state-observer.ts
└── auth-errors.ts
```

### Tasks

#### Task 1.1-1.5: (Unchanged from original - 36 tests)
See original component breakdown for Tasks 1.1-1.5.

---

#### Task 1.6: Implement E2EEncryptionService 🔴 NEW
**Complexity**: High  
**Duration**: 2 days  
**Test Count**: 15 integration tests  
**Security Impact**: **CRITICAL** - GDPR compliance

- [ ] Implement `E2EEncryptionService` class
  ```typescript
  export class E2EEncryptionService implements IE2EEncryptionService {
    constructor(
      private readonly keyManager: IKeyManager,
      private readonly logger: ILogger
    ) {}
    
    async encrypt(data: HighlightDataV2, userId: string): Promise<EncryptedHighlight> {
      const publicKey = await this.keyManager.getPublicKey(userId);
      const dataStr = JSON.stringify(data);
      const encoded = new TextEncoder().encode(dataStr);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        encoded
      );
      
      return {
        ciphertext: arrayBufferToBase64(encrypted),
        algorithm: 'RSA-OAEP',
        keyVersion: 1,
      };
    }
    
    async decrypt(encrypted: EncryptedHighlight, userId: string): Promise<HighlightDataV2> {
      const privateKey = await this.keyManager.getPrivateKey(userId);
      const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        ciphertext
      );
      
      const decoded = new TextDecoder().decode(decrypted);
      return JSON.parse(decoded);
    }
  }
  ```
- [ ] Use RSA-OAEP (2048-bit) for highlight encryption
- [ ] Add key versioning for rotation support
- [ ] Add error handling for decryption failures
- [ ] Integrate with SupabaseClient to encrypt before upload

**Tests** (Integration):
1. Encrypt/decrypt round-trip works
2. Same data encrypts differently each time
3. Wrong private key fails decryption
4. Invalid ciphertext throws error
5. Large highlights (>10KB) handled
6. Unicode text preserved
7. Key versioning works
8. Decryption failure logs securely
9. Performance: encrypt 1KB in <50ms
10. Performance: decrypt 1KB in <50ms
11. Concurrent encryption works
12. Key rotation doesn't break old encrypted data
13. Empty highlight handled
14. Null fields handled
15. Integration with SupabaseClient verified

**Reference**: `docs/06-security/security-architecture.md:153-158` (E2E encryption requirement)

---

#### Task 1.7: Implement KeyManager 🔴 NEW
**Complexity**: High  
**Duration**: 3 days  
**Test Count**: 20 unit tests  
**Security Impact**: **HIGH** - Data recovery depends on this

- [ ] Implement `KeyManager` class
  ```typescript
  export class KeyManager implements IKeyManager {
    private keyCache = new Map<string, CryptoKey>();
    
    constructor(
      private readonly storage: IStorage,
      private readonly logger: ILogger
    ) {}
    
    async generateKeypair(userId: string): Promise<{ publicKey: string; privateKey: string }> {
      const keypair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      // Export public key (store in Supabase for sharing)
      const publicKeyData = await crypto.subtle.exportKey('spki', keypair.publicKey);
      
      // Export private key (encrypt and store locally)
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keypair.privateKey);
      const encryptedPrivateKey = await this.encryptPrivateKey(privateKeyData, userId);
      
      await this.storage.set(`privateKey:${userId}`, encryptedPrivateKey);
      
      return {
        publicKey: arrayBufferToBase64(publicKeyData),
        privateKey: arrayBufferToBase64(privateKeyData), // Return for backup
      };
    }
    
    async getPrivateKey(userId: string): Promise<CryptoKey> {
      // Check cache first
      const cacheKey = `private:${userId}`;
      if (this.keyCache.has(cacheKey)) {
        return this.keyCache.get(cacheKey)!;
      }
      
      // Load from storage
      const encrypted = await this.storage.get(`privateKey:${userId}`);
      if (!encrypted) {
        throw new KeyNotFoundError(`Private key not found for user ${userId}`);
      }
      
      const decryptedData = await this.decryptPrivateKey(encrypted, userId);
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        decryptedData,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      );
      
      // Cache for performance
      this.keyCache.set(cacheKey, privateKey);
      
      return privateKey;
    }
    
    private async encryptPrivateKey(keyData: ArrayBuffer, userId: string): Promise<EncryptedData> {
      // Derive encryption key from user session (token-based)
      const masterKey = await this.deriveMasterKey(userId);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        masterKey,
        keyData
      );
      
      return {
        ciphertext: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv),
      };
    }
  }
  ```
- [ ] Generate RSA-2048 keypairs for users
- [ ] Encrypt private key with AES-GCM before storage
- [ ] Store private key in chrome.storage.local (encrypted)
- [ ] Cache keys in memory for performance
- [ ] Add key rotation support
- [ ] Add key backup/recovery flow

**Tests** (Unit):
1. Generate keypair creates valid keys
2. Private key encrypted in storage
3. Get private key decrypts correctly
4. Key cache works (performance)
5. Missing key throws KeyNotFoundError
6. Key rotation generates new keys
7. Old keys still decrypt old data
8. Concurrent key access works
9. Key cache eviction works
10. Invalid encrypted key throws error
11. Master key derivation consistent
12. Public key export works
13. Private key import works
14. Key versioning increments
15. Backup export works
16. Restore from backup works
17. Multiple users have separate keys
18. Key deletion clears cache
19. Memory leak test (1000 keys)
20. Performance: get key <10ms (cached)

**Reference**: `docs/06-security/threat-model.md:373-376` (Secure key management)

---

#### Task 1.8: Implement AuditLogger 🟡 NEW
**Complexity**: Medium  
**Duration**: 1 day  
**Test Count**: 5 unit tests  
**Security Impact**: **MEDIUM** - Compliance and breach detection

- [ ] Implement `AuditLogger` class
  ```typescript
  export class AuditLogger implements IAuditLogger {
    constructor(
      private readonly storage: IStorage,
      private readonly logger: ILogger
    ) {}
    
    async logAuthEvent(userId: string, event: AuthEvent): Promise<void> {
      const record = {
        timestamp: Date.now(),
        userId,
        event: event.type,
        ip: await this.getClientIP(), // Optional
        userAgent: navigator.userAgent,
        success: event.success,
      };
      
      await this.storage.append('audit_log', record);
      
      if (!event.success && event.type === 'login') {
        this.checkBruteForce(userId);
      }
    }
    
    async logDataAccess(userId: string, operation: 'read' | 'write' | 'delete', resourceId: string): Promise<void> {
      const record = {
        timestamp: Date.now(),
        userId,
        operation,
        resourceId,
      };
      
      await this.storage.append('audit_log', record);
    }
    
    async logSuspiciousActivity(userId: string, description: string): Promise<void> {
      const record = {
        timestamp: Date.now(),
        userId,
        type: 'suspicious',
        description,
      };
      
      await this.storage.append('audit_log', record);
      this.logger.warn('Suspicious activity detected', record);
    }
  }
  ```
- [ ] Log all auth events (login, logout, failed login)
- [ ] Log data access (read, write, delete)
- [ ] Log suspicious activity
- [ ] Store in IndexedDB with 90-day retention
- [ ] Add brute force detection (5 failed logins = lock)

**Tests** (Unit):
1. Auth events logged
2. Data access logged
3. Suspicious activity logged
4. Brute force detection works
5. Retention policy enforced (90 days)

**Reference**: `docs/06-security/security-audit-report.md` (GDPR Article 32)

---

#### Task 1.9: Implement CSPValidator 🟡 NEW
**Complexity**: Low  
**Duration**: 0.5 day  
**Test Count**: 2 unit tests  
**Security Impact**: **MEDIUM** - XSS protection for OAuth

- [ ] Implement `CSPValidator` class
  ```typescript
  export class CSPValidator {
    static validateOAuthRedirectCSP(): boolean {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!meta) return false;
      
      const csp = meta.getAttribute('content');
      return csp?.includes("script-src 'self'") && !csp?.includes("'unsafe-inline'");
    }
  }
  ```
- [ ] Validate CSP for OAuth redirect pages
- [ ] Ensure no `unsafe-inline` scripts allowed
- [ ] Log CSP violations

**Tests** (Unit):
1. Valid CSP passes
2. Missing CSP fails

**Reference**: `docs/06-security/security-architecture.md:17-35` (CSP requirement)

---

### Component 1 Summary

| Original Tests | New Tests | Total Tests |
|----------------|-----------|-------------|
| 36 | +44 | **80** |

**New Duration**: Week 1 (Auth + API) + Week 7 (Security hardening) = **1.5 weeks allocated**

---

## Component 2: API Client Layer + Scalability

### Overview
HTTP client for Supabase REST API with retry logic, circuit breaker, error handling, **pagination, caching, and HTTPS enforcement**.

### Files to Create (NEW additions marked)

```
src/background/api/
├── interfaces/
│   ├── i-api-client.ts
│   ├── i-pagination-client.ts          # NEW
│   └── i-cache-manager.ts              # NEW
├── supabase-client.ts
├── pagination-client.ts                # NEW
├── cache-manager.ts                    # NEW
├── https-validator.ts                  # NEW
├── api-error-handler.ts
└── api-errors.ts
```

### Tasks

#### Task 2.1-2.3: (Unchanged - 12 tests)
See original component breakdown.

---

#### Task 2.4: Implement PaginationClient 🔵 NEW
**Complexity**: Medium  
**Duration**: 1 day  
**Test Count**: 8 unit tests  
**Scalability Impact**: **HIGH** - Prevents timeout on large datasets

- [ ] Implement `PaginationClient` class
  ```typescript
  export class PaginationClient {
    private readonly pageSize = 100;
    
    constructor(private readonly apiClient: IAPIClient) {}
    
    async *pullEventsPaginated(since: number): AsyncGenerator<SyncEvent[], void> {
      let cursor: string | null = null;
      
      while (true) {
        const { events, nextCursor } = await this.apiClient.pullEventsWithCursor({
          since,
          cursor,
          limit: this.pageSize,
        });
        
        if (events.length > 0) {
          yield events;
        }
        
        if (!nextCursor) break;
        cursor = nextCursor;
      }
    }
  }
  ```
- [ ] Implement cursor-based pagination for `pullEvents()`
- [ ] Page size: 100 events per page
- [ ] Use AsyncGenerator for streaming
- [ ] Add timeout per page (5s)

**Tests** (Unit):
1. Single page handled
2. Multiple pages streamed
3. Empty result handled
4. Large dataset (1000+ events) paginated
5. Cursor reset on error
6. Timeout per page works
7. Memory efficient (streaming)
8. Integration with SupabaseClient

**Deferred to Future**: Server-side cursor implementation (needs Supabase schema change)

---

#### Task 2.5: Implement CacheManager 🔵 NEW
**Complexity**: Medium  
**Duration**: 1 day  
**Test Count**: 10 unit tests  
**Scalability Impact**: **MEDIUM** - Reduces bandwidth usage

- [ ] Implement `CacheManager` with LRU eviction
  ```typescript
  export class CacheManager<K, V> {
    private cache = new Map<K, CacheEntry<V>>();
    private readonly maxSize: number;
    private readonly ttl: number;
    
    constructor(maxSize = 100, ttlMs = 300000) { // 5min TTL
      this.maxSize = maxSize;
      this.ttl = ttlMs;
    }
    
    set(key: K, value: V): void {
      // Evict if full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
      });
    }
    
    get(key: K): V | null {
      const entry = this.cache.get(key);
      if (!entry) return null;
      
      // Check TTL
      if (Date.now() - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        return null;
      }
      
      // Move to end (LRU)
      this.cache.delete(key);
      this.cache.set(key, entry);
      
      return entry.value;
    }
  }
  ```
- [ ] LRU eviction (max 100 entries)
- [ ] TTL: 5 minutes
- [ ] Cache `pullEvents()` responses
- [ ] Cache `getHighlights()` responses

**Tests** (Unit):
1. Set/get works
2. LRU eviction works
3. TTL expiration works
4. Cache hit/miss metrics
5. Concurrent access works
6. Memory efficient
7. Clear cache works
8. Cache invalidation on write
9. Performance: get <1ms
10. Integration with SupabaseClient

---

#### Task 2.6: Implement HTTPSValidator 🟡 NEW
**Complexity**: Low  
**Duration**: 0.5 day  
**Test Count**: 3 unit tests  
**Security Impact**: **MEDIUM** - MITM attack prevention

- [ ] Implement `HTTPSValidator` class
  ```typescript
  export class HTTPSValidator {
    static validate(url: string): void {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        throw new SecurityError(`API must use HTTPS, got: ${parsed.protocol}`);
      }
    }
  }
  ```
- []] Validate all API URLs use HTTPS
- [ ] Throw SecurityError if HTTP detected
- [ ] Add to SupabaseClient constructor

**Tests** (Unit):
1. HTTPS URL passes
2. HTTP URL throws error
3. Invalid URL throws error

**Reference**: `docs/06-security/threat-model.md:43-48` (Network attack mitigation)

---

### Component 2 Summary

| Original Tests | New Tests | Total Tests |
|----------------|-----------|-------------|
| 12 | +21 | **33** |

**New Duration**: Week 1 (included in Auth + API week)

---

## Component 3: Event Sourcing + Input Validation

### Overview
Event sourcing (ADR-001) with IndexedDB event store, **plus input sanitization for XSS protection**.

### Files to Create (NEW additions marked)

```
src/background/events/
├── interfaces/
│   ├── i-event-store.ts
│   ├── i-event-publisher.ts
│   └── i-input-sanitizer.ts            # NEW
├── event-store.ts
├── event-publisher.ts
├── event-replayer.ts
├── input-sanitizer.ts                  # NEW
├── event-validator.ts                  # NEW
└── event-types.ts
```

### Tasks

#### Task 3.1-3.4: (Unchanged - 52 tests)
See original component breakdown.

---

#### Task 3.5: Implement InputSanitizer 🔴 NEW
**Complexity**: Medium  
**Duration**: 0.5 day  
**Test Count**: 5 unit tests  
**Security Impact**: **CRITICAL** - XSS protection

- [ ] Implement `InputSanitizer` using DOMPurify
  ```typescript
  import DOMPurify from 'dompurify';
  
  export class InputSanitizer implements IInputSanitizer {
    sanitizeText(text: string): string {
      return DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [], // Strip all tags
        KEEP_CONTENT: true,
      });
    }
    
    sanitizeHTML(html: string): string {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark'],
        ALLOWED_ATTR: [],
      });
    }
    
    sanitizeURL(url: string): string | null {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return null;
        }
        return parsed.href;
      } catch {
        return null;
      }
    }
  }
  ```
- [ ] Install DOMPurify: `npm install dompurify @types/dompurify`
- [ ] Sanitize highlight text before storing in EventStore
- [ ] Sanitize all user inputs (collection names, tags, notes - future)
- [ ] Integrate into EventStore.append()

**Tests** (Unit):
1. XSS attempt sanitized (`<script>alert('xss')</script>` → empty)
2. JavaScript URL blocked (`javascript:alert(1)` → null)
3. Safe HTML preserved (`<strong>bold</strong>` → `<strong>bold</strong>`)
4. Unicode preserved (`日本語` → `日本語`)
5. Empty string handled

**Reference**: `docs/06-security/security-architecture.md:38-83` (DOMPurify requirement)  
**Reference**: `docs/06-security/threat-model.md:60-86` (T1: XSS mitigation)

---

### Component 3 Summary

| Original Tests | New Tests | Total Tests |
|----------------|-----------|-------------|
| 52 | +5 | **57** |

**New Duration**: Week 2 (already allocated)

---

## Component 4: Sync Engine + Rate Limiting

### Overview
Sync queue, batching, offline queue, network detection, **plus rate limiting for DoS protection**.

### Files to Create (NEW additions marked)

```
src/background/sync/
├── interfaces/
│   ├── i-sync-queue.ts
│   ├── i-network-detector.ts
│   └── i-rate-limiter.ts                # NEW
├── sync-queue.ts
├── sync-batcher.ts
├── rate-limiter.ts                      # NEW
├── offline-queue.ts
├── network-detector.ts
└── sync-status.ts
```

### Tasks

#### Task 4.1-4.4: (Unchanged - 31 tests)
See original component breakdown.

---

#### Task 4.5: Implement RateLimiter 🔴 NEW
**Complexity**: Medium  
**Duration**: 1 day  
**Test Count**: 8 unit tests  
**Security Impact**: **HIGH** - DoS protection

- [ ] Implement `RateLimiter` with token bucket algorithm
  ```typescript
  export class RateLimiter implements IRateLimiter {
    private buckets = new Map<string, TokenBucket>();
    
    async checkLimit(userId: string, operation: string): Promise<boolean> {
      const key = `${userId}:${operation}`;
      let bucket = this.buckets.get(key);
      
      if (!bucket) {
        bucket = this.createBucket(operation);
        this.buckets.set(key, bucket);
      }
      
      return bucket.tryConsume();
    }
    
    private createBucket(operation: string): TokenBucket {
      const config = this.getRateLimitConfig(operation);
      return new TokenBucket(config.capacity, config.refillRate);
    }
    
    private getRateLimitConfig(operation: string): RateLimitConfig {
      switch (operation) {
        case 'sync':
          return { capacity: 10, refillRate: 10 / 60 }; // 10 per minute
        case 'auth':
          return { capacity: 5, refillRate: 5 / 900 }; // 5 per 15 min
        default:
          return { capacity: 100, refillRate: 100 / 60 }; // 100 per minute
      }
    }
  }
  
  class TokenBucket {
    private tokens: number;
    private lastRefill: number;
    
    constructor(
      private readonly capacity: number,
      private readonly refillRate: number
    ) {
      this.tokens = capacity;
      this.lastRefill = Date.now();
    }
    
    tryConsume(): boolean {
      this.refill();
      
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      
      return false;
    }
    
    private refill(): void {
      const now = Date.now();
      const elapsed = now - this.lastRefill;
      const tokensToAdd = (elapsed / 1000) * this.refillRate;
      
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  ```
- [ ] Token bucket algorithm (capacity + refill rate)
- [ ] Rate limits:
  - Sync: 10/minute
  - Auth: 5/15min
  - API: 100/minute
- [ ] Per-user buckets
- [ ] Integrate into SyncQueue and AuthManager

**Tests** (Unit):
1. Rate limit enforced
2. Token refill works
3. Multiple users have separate buckets
4. Burst traffic handled (up to capacity)
5. Sustained traffic throttled
6. Different operations have different limits
7. Exceeded limit returns false
8. Metrics tracked (attempts, blocked)

**Reference**: `docs/06-security/threat-model.md:222-244` (T7: Resource exhaustion mitigation)

---

### Component 4 Summary

| Original Tests | New Tests | Total Tests |
|----------------|-----------|-------------|
| 31 | +8 | **39** |

**New Duration**: Week 3 (already allocated)

---

## Components 5-7: (Unchanged)

See original component breakdown for:
- **Component 5**: Conflict Resolution (54 tests) - Week 4
- **Component 6**: Real-Time Sync (25 tests) - Week 5  
- **Component 7**: Migration (34 tests) - Week 6

**Note**: Component 6 will add **ConnectionPool** in future (deferred to Phase 3 - Gen Mode prep)

---

## Testing Summary (Updated)

### Total Test Count by Component

| Component | Original | +Security | +Scalability | Total |
|-----------|----------|-----------|--------------|-------|
| C1: Auth & Security | 36 | +44 | 0 | 80 |
| C2: API + Scalability | 12 | +3 | +18 | 33 |
| C3: Events + Validation | 52 | +5 | 0 | 57 |
| C4: Sync + Rate Limit | 31 | +8 | 0 | 39 |
| C5: Conflicts | 54 | 0 | 0 | 54 |
| C6: Realtime | 25 | 0 | 0 | 25 |
| C7: Migration | 34 | 0 | 0 | 34 |
| **TOTAL** | **244** | **+60** | **+18** | **322** |

**Note**: Revised from 312 to 322 tests (+10 from refined estimates)

### Test Distribution

- **Unit Tests**: 58% (187/322)
- **Integration Tests**: 39% (126/322)
- **E2E Tests**: 3% (9/322)

---

## Implementation Order (Week-by-Week)

### Week 1: Foundation + Security Core
**Goal**: Auth + API + E2E Encryption working

- [ ] C1.1-1.5: Authentication Layer (original)
- [ ] C1.6: E2EEncryptionService (NEW - 2 days)
- [ ] C1.7: KeyManager (NEW - 3 days)
- [ ] C2.1-2.3: API Client (original)
- [ ] C2.6: HTTPSValidator (NEW - 0.5 day)
- [ ] **Deliverable**: Secure signup/login with E2E encrypted highlights

### Week 2: Event Sourcing + Input Validation
**Goal**: Event store + XSS protection working

- [ ] C3.1-3.4: Event Sourcing Layer (original)
- [ ] C3.5: InputSanitizer (NEW - 0.5 day)
- [ ] **Deliverable**: Events persisted securely, XSS attacks blocked

### Week 3: Sync + Scalability
**Goal**: Offline-first sync + rate limiting working

- [ ] C4.1-4.4: Sync Engine (original)
- [ ] C4.5: RateLimiter (NEW - 1 day)
- [ ] C2.4: PaginationClient (NEW - 1 day)
- [ ] C2.5: CacheManager (NEW - 1 day)
- [ ] **Deliverable**: Sync works offline, rate limited, paginated

### Week 4: Conflict Resolution
**Goal**: Multi-device conflicts resolved

- [ ] C5.1-5.3: Conflict Resolution (unchanged)
- [ ] **Deliverable**: Vector clock conflicts handled

### Week 5: Real-Time Sync
**Goal**: WebSocket real-time updates

- [ ] C6.1-6.2: WebSocket Integration (unchanged)
- [ ] **Deliverable**: Highlights sync in real-time (<3s latency)

### Week 6: Migration
**Goal**: Local→Cloud migration complete

- [ ] C7.1-7.3: Migration Service (unchanged)
- [ ] **Deliverable**: Existing users migrated

### Week 7: Security Hardening + Polish
**Goal**: Production-ready security

- [ ] C1.8: AuditLogger (NEW - 1 day)
- [ ] C1.9: CSPValidator (NEW - 0.5 day)
- [ ] Integration testing (all components) - 2 days
- [ ] Security audit - 0.5 day
- [ ] **Deliverable**: Security gaps closed

### Week 7.5: Final Testing + Deploy Prep
**Goal**: Production deployment ready

- [ ] E2E testing (critical paths) - 1 day
- [ ] Performance optimization - 1 day
- [ ] Documentation - 0.5 day
- [ ] **Deliverable**: Phase 2 complete ✅

---

## Quality Gates (Updated)

### Per-Week Gates

**Every Week Must Pass**:
- [ ] 0 TypeScript errors (`npm run type-check`)
- [ ] 0 ESLint errors (`npm run lint`)
- [ ] 100% Prettier compliance (`npm run format`)
- [ ] All tests passing (`npm test`)
- [ ] Code coverage >85%

### Final Gate (Week 7.5)

**Functional**:
- [ ] All 322 tests passing
- [ ] E2E tests passing (9 scenarios)
- [ ] Performance benchmarks met:
  - Sync latency <3s (p95)
  - API response <500ms (p95)
  - WebSocket latency <100ms (p95)
  - Encryption overhead <50ms (p95)

**Security** (NEW):
- [ ] E2E encryption verified (15 tests)
- [ ] XSS protection verified (5 tests)
- [ ] Rate limiting verified (8 tests)
- [ ] Audit logging verified (5 tests)
- [ ] HTTPS enforcement verified (3 tests)
- [ ] No security vulnerabilities (npm audit)

**Scalability** (NEW):
- [ ] Pagination handles 10K events
- [ ] Cache hit rate >70%
- [ ] Rate limiting prevents DoS
- [ ] Memory usage <100MB

---

## Future Deferred Tasks

These tasks are deferred to future phases (Gen Mode Phase 3):

### Resource Pooling (Component 6)
- WebSocket connection pooling
- Estimated: +1 day, +5 tests

### Gen Mode Components (Phase 3)
- AI Service Layer (50 tests)
- Feature Flags (15 tests)
- Quota Management (20 tests)
- Estimated: +3.5 weeks

---

## Git Strategy (Unchanged)

See original component breakdown for granular commit guidelines.

**Example commits for NEW components**:
```
feat(auth): implement E2E encryption with RSA-2048

- Add E2EEncryptionService with RSA-OAEP
- Integrate with SupabaseClient
- Add 15 integration tests

Closes #124
```

```
feat(security): add rate limiting with token bucket

- Implement RateLimiter with configurable limits
- Add per-user, per-operation buckets
- Add 8 unit tests

Refs: docs/06-security/threat-model.md#T7
```

---

## Summary of Changes (v2.0 → v3.0)

### Added Components (Security)
1. **E2EEncryptionService** - GDPR-compliant encryption
2. **KeyManager** - Secure keypair management
3. **AuditLogger** - Security event tracking
4. **CSPValidator** - OAuth XSS protection
5. **InputSanitizer** - DOMPurify integration
6. **HTTPSValidator** - MITM prevention
7. **RateLimiter** - DoS protection

### Added Components (Scalability)
8. **PaginationClient** - Cursor-based pagination
9. **CacheManager** - LRU caching

### Timeline Impact
- **Original**: 6 weeks, 244 tests
- **Updated**: 7.5 weeks, 322 tests
- **Increase**: +1.5 weeks (+25%), +78 tests (+32%)

### Security Posture
- **Before**: 5/10 (8 critical gaps)
- **After**: 9/10 (production-ready)

---

**Document Status**: Ready for Implementation (v3.0)  
**Next Steps**: Review with team, start Week 1 tasks  
**Gen Mode Readiness**: 70% (deferred components in Phase 3)
