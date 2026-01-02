# Phase 5 & 5.1: Deferred Tasks Backlog

**Date Created:** 2026-01-02  
**Last Updated:** 2026-01-02 14:11 UTC  
**Purpose:** Track all deferred tasks for future implementation  
**Status:** Reference Document

---

## Overview

This document consolidates all tasks that were intentionally deferred during Phase 5 (Mode Implementations) and Phase 5.1 (Encryption Validation). Each task includes:
- **Priority** (LOW/MEDIUM/HIGH)
- **Effort Estimate**
- **Rationale for Deferral**
- **Implementation Guidance**

---

## Completed Tasks

### ✅ JSDoc Documentation (COMPLETE - 2026-01-02)

**Status:** COMPLETE  
**Effort:** ~3 hours actual (vs 10-15 hours estimated)  
**Commit:** `25448d6`

**What Was Completed:**
- [x] Walk Mode JSDoc (5 methods)
- [x] Sprint Mode JSDoc (5 methods)
- [x] Crypto Utils JSDoc (4 functions)

**Documentation Added:**
- @param, @returns, @throws annotations
- @remarks with implementation details
- @security warnings and guarantees
- @example code snippets
- Cross-domain isolation notes
- Tampering detection details
- TTL behavior explanations

**Files Modified:**
- `src/content/modes/walk-mode.ts` (+120 lines)
- `src/content/modes/sprint-mode.ts` (+140 lines)
- `src/shared/utils/crypto-utils.ts` (+62 lines)

---

## Phase 5: Mode Implementation Deferred Tasks

### 1. Integration Tests

#### 1.1 Walk Mode Integration Tests
**Priority:** MEDIUM  
**Effort:** 4-6 hours  
**Deferred Because:** Unit tests provide sufficient coverage (18/18 passing)

**Tasks:**
- [ ] Mode state manager integration (5 tests)
- [ ] Walk → Sprint mode switching with data cleanup
- [ ] Walk → Vault mode switching validation
- [ ] Memory leak detection tests
- [ ] DOM cleanup verification

**Implementation Guidance:**
```typescript
// File: tests/integration/walk-mode-integration.test.ts
describe('Walk Mode Integration', () => {
  it('should clean up all data on mode switch', async () => {
    const walkMode = new WalkMode(/* ... */);
    await walkMode.createHighlight(selection, 'yellow');
    
    // Switch to Sprint Mode
    await modeManager.switchMode('sprint');
    
    // Verify Walk Mode data is gone
    const highlights = await walkMode.getAllHighlights();
    expect(highlights).toHaveLength(0);
  });
});
```

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 14

---

#### 1.2 Sprint Mode Integration Tests
**Priority:** MEDIUM  
**Effort:** 3-4 hours  
**Deferred Because:** Event sourcing tests cover core functionality

**Tasks:**
- [ ] TTL cleanup integration tests (3 tests)
- [ ] Event sourcing with real storage
- [ ] Cross-session persistence validation
- [ ] TTL expiration edge cases

**Implementation Guidance:**
```typescript
// File: tests/integration/sprint-ttl-integration.test.ts
describe('Sprint Mode TTL Integration', () => {
  it('should clean up expired highlights on restore', async () => {
    const sprintMode = new SprintMode(/* ... */);
    
    // Create highlight with 1ms TTL
    await sprintMode.createHighlight(selection, 'yellow');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Restore should clean up
    await sprintMode.restore();
    const highlights = await sprintMode.getAllHighlights();
    expect(highlights).toHaveLength(0);
  });
});
```

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 24

---

#### 1.3 Vault Mode Integration Tests
**Priority:** HIGH  
**Effort:** 8-10 hours  
**Deferred Because:** Vault Mode is future phase, not current priority

**Tasks:**
- [ ] IndexedDB persistence integration (12 tests)
- [ ] 3-tier anchoring system validation
- [ ] Cross-session restore with real DB
- [ ] Data migration scenarios
- [ ] Error recovery flows

**Implementation Guidance:**
```typescript
// File: tests/integration/vault-mode-integration.test.ts
describe('Vault Mode Integration', () => {
  it('should persist to IndexedDB and restore', async () => {
    const vaultMode = new VaultMode(/* ... */);
    
    await vaultMode.createHighlight(selection, 'yellow');
    
    // Simulate page reload
    const newVaultMode = new VaultMode(/* ... */);
    await newVaultMode.restore();
    
    const highlights = await newVaultMode.getAllHighlights();
    expect(highlights).toHaveLength(1);
  });
});
```

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 34

---

### 2. End-to-End Tests

#### 2.1 Vault Mode E2E Tests
**Priority:** HIGH  
**Effort:** 6-8 hours  
**Deferred Because:** Requires browser automation setup

**Tasks:**
- [ ] E2E persistence tests (2 tests)
- [ ] Real browser page reload scenarios
- [ ] Cross-tab synchronization
- [ ] Performance under load

**Implementation Guidance:**
```typescript
// File: tests/e2e/vault-mode.e2e.test.ts
// Requires Playwright or Puppeteer
describe('Vault Mode E2E', () => {
  it('should persist highlights across page reloads', async () => {
    await page.goto('https://example.com');
    
    // Create highlight
    await page.evaluate(() => {
      // Highlight creation logic
    });
    
    // Reload page
    await page.reload();
    
    // Verify highlight restored
    const highlights = await page.evaluate(() => {
      // Get highlights
    });
    expect(highlights).toHaveLength(1);
  });
});
```

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 35

---

### 3. Performance Benchmarks

#### 3.1 Mode Performance Tests
**Priority:** LOW  
**Effort:** 4-5 hours  
**Deferred Because:** No performance issues observed

**Tasks:**
- [ ] Walk Mode performance benchmarks (1 test)
- [ ] Sprint Mode performance benchmarks (1 test)
- [ ] Vault Mode performance benchmarks (1 test)
- [ ] Mode switching performance
- [ ] Memory usage profiling

**Implementation Guidance:**
```typescript
// File: tests/performance/mode-benchmarks.test.ts
describe('Mode Performance', () => {
  it('should create 100 highlights in <500ms', async () => {
    const mode = new SprintMode(/* ... */);
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await mode.createHighlight(mockSelection(), 'yellow');
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
});
```

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 44, 60

---

### 4. Documentation

#### 4.1 JSDoc Documentation ✅ COMPLETE
**Priority:** MEDIUM  
**Effort:** 3 hours actual (vs 6-8 hours estimated)  
**Status:** ✅ COMPLETE (2026-01-02)

**Completed:**
- [x] Add JSDoc to all public APIs (Walk Mode, Sprint Mode)
- [x] Document mode interfaces
- [x] Add usage examples
- [x] Security warnings and guarantees

**See:** Completed Tasks section above for details

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 50

---

#### 4.2 Mode Comparison Guide
**Priority:** LOW  
**Effort:** 2-3 hours  
**Deferred Because:** Not user-facing yet

**Tasks:**
- [ ] Create mode comparison table
- [ ] Document use cases for each mode
- [ ] Add decision tree for mode selection
- [ ] Include performance characteristics

**Implementation Guidance:**
```markdown
# Mode Comparison Guide

| Feature | Walk Mode | Sprint Mode | Vault Mode |
|---------|-----------|-------------|------------|
| Persistence | None | 4 hours | Permanent |
| Storage | Memory | chrome.storage | IndexedDB |
| Use Case | Quick reading | Research session | Long-term study |
```

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 51

---

#### 4.3 Migration Guide
**Priority:** LOW  
**Effort:** 3-4 hours  
**Deferred Because:** No users yet

**Tasks:**
- [ ] Document Walk → Sprint migration
- [ ] Document Sprint → Vault migration
- [ ] Add data export/import guide
- [ ] Include troubleshooting

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 52

---

#### 4.4 Troubleshooting Guide
**Priority:** LOW  
**Effort:** 2-3 hours  
**Deferred Because:** No common issues identified yet

**Tasks:**
- [ ] Common issues and solutions
- [ ] Debug mode instructions
- [ ] Error message catalog
- [ ] Recovery procedures

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 53

---

#### 4.5 Mode-Specific Behavior Documentation
**Priority:** MEDIUM  
**Effort:** 2-3 hours per mode  
**Deferred Because:** Code comments sufficient for now

**Tasks:**
- [ ] Walk Mode behavior documentation
- [ ] Sprint Mode behavior documentation
- [ ] Vault Mode architecture documentation

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) lines 15, 25, 36

---

### 5. Regression Testing

#### 5.1 Full Regression Suite
**Priority:** MEDIUM  
**Effort:** 10-15 hours  
**Deferred Because:** 58 pre-existing failures need investigation first

**Tasks:**
- [ ] Investigate 58 pre-existing test failures
- [ ] Fix or document each failure
- [ ] Achieve 100% pass rate (828 tests)
- [ ] Add to CI/CD pipeline

**Current Status:** 770/828 passing (93%)

**Implementation Guidance:**
1. Run full suite: `npx vitest run`
2. Categorize failures (setup, flaky, real bugs)
3. Fix real bugs first
4. Document or skip flaky tests
5. Verify no Phase 5 regressions

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 61

---

## Phase 5.1: Encryption Deferred Tasks

### 6. Encryption Integration Tests

#### 6.1 StorageService Encryption Integration
**Priority:** LOW  
**Effort:** 4-6 hours  
**Deferred Because:** chrome.storage.local mocking is complex, unit tests sufficient

**Tasks:**
- [ ] Verify storage contains no plaintext
- [ ] Load/decrypt events correctly
- [ ] Cross-domain isolation in integration

**Rationale for Deferral:**
- Unit tests validate encryption logic (15/15 passing)
- Code review confirms StorageService integration
- Mocking chrome.storage.local requires significant effort
- ROI: LOW (unit tests prove security guarantees)

**Implementation Guidance:**
```typescript
// File: tests/integration/crypto-integration.test.ts
// Requires proper chrome.storage.local mock or real browser environment

describe('StorageService Encryption Integration', () => {
  it('should not store plaintext', async () => {
    const storage = new StorageService();
    await storage.saveEvent({
      type: 'highlight.created' as const,
      data: { text: 'SENSITIVE_DATA' }
    });
    
    // Get raw storage
    const hashedDomain = await hashDomain(window.location.hostname);
    const raw = await chrome.storage.local.get(hashedDomain);
    
    // Verify encrypted
    expect(JSON.stringify(raw)).not.toContain('SENSITIVE_DATA');
  });
});
```

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) lines 91-93
- [encryption-implementation-plan.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/encryption-implementation-plan.md) lines 260-343

---

### 7. Security Hardening

#### 7.1 Domain Validation
**Priority:** LOW  
**Effort:** 1-2 hours  
**Deferred Because:** Not critical for current implementation

**Tasks:**
- [ ] Add domain validation before key derivation
- [ ] Reject invalid domains (empty, too short, etc.)
- [ ] Add security error types

**Implementation Guidance:**
```typescript
// File: src/shared/utils/crypto-utils.ts

function validateDomain(domain: string): void {
  if (!domain || domain.length < 3) {
    throw new SecurityError('Invalid domain for key derivation');
  }
  if (!/^[a-z0-9.-]+$/i.test(domain)) {
    throw new SecurityError('Domain contains invalid characters');
  }
}

export async function encryptData(data: string, domain: string): Promise<string> {
  validateDomain(domain); // Add validation
  const key = await deriveKey(domain);
  // ... rest of implementation
}
```

**References:**
- [encryption-implementation-plan.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/encryption-implementation-plan.md) lines 347-379

---

#### 7.2 Version Metadata
**Priority:** LOW  
**Effort:** 2-3 hours  
**Deferred Because:** Future-proofing, not needed now

**Tasks:**
- [ ] Add version field to encrypted data
- [ ] Support migration between versions
- [ ] Add salt rotation support

**Implementation Guidance:**
```typescript
// File: src/shared/utils/crypto-utils.ts

export const SALT_VERSION = 'v1';

interface EncryptedData {
  version: string;
  ciphertext: string;
}

export async function encryptData(data: string, domain: string): Promise<string> {
  // ... encryption logic
  
  const encrypted: EncryptedData = {
    version: SALT_VERSION,
    ciphertext: base64Ciphertext
  };
  
  return JSON.stringify(encrypted);
}
```

**References:**
- [encryption-implementation-plan.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/encryption-implementation-plan.md) lines 354-368

---

#### 7.3 JSDoc Security Warnings ✅ COMPLETE
**Priority:** LOW  
**Effort:** 1 hour actual (vs 1-2 hours estimated)  
**Status:** ✅ COMPLETE (2026-01-02)

**Completed:**
- [x] Add JSDoc to crypto-utils.ts
- [x] Document security properties
- [x] Add usage warnings
- [x] Document threat model

**See:** Completed Tasks section above for details

**References:**
- [task.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/task.md) line 99
- [encryption-implementation-plan.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/encryption-implementation-plan.md) line 374

---

### 8. Performance Tests

#### 8.1 Encryption Performance Benchmarks
**Priority:** LOW  
**Effort:** 2-3 hours  
**Deferred Because:** No performance issues observed

**Tasks:**
- [ ] Bulk encryption benchmarks
- [ ] Key derivation caching analysis
- [ ] Memory usage profiling

**Implementation Guidance:**
```typescript
// File: tests/performance/crypto-benchmarks.test.ts

describe('Encryption Performance', () => {
  it('should encrypt 100 events in <500ms', async () => {
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      await encryptData(`event-${i}`, 'example.com');
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
  
  it('should benefit from key caching', async () => {
    // First call (cold)
    const t1 = performance.now();
    await encryptData('test', 'example.com');
    const firstCall = performance.now() - t1;
    
    // Second call (warm)
    const t2 = performance.now();
    await encryptData('test', 'example.com');
    const secondCall = performance.now() - t2;
    
    // Document if caching exists
    console.log('First call:', firstCall, 'ms');
    console.log('Second call:', secondCall, 'ms');
    console.log('Speedup:', (firstCall / secondCall).toFixed(2), 'x');
  });
});
```

**References:**
- [encryption-implementation-plan.md](file:///home/sandy/.gemini/antigravity/brain/69e659f0-e6e0-477f-ba9f-2d86e4a8178f/encryption-implementation-plan.md) lines 383-426

---

## Future Enhancements (Long-term)

### 9. Vault Mode Features

#### 9.1 Key Rotation
**Priority:** MEDIUM  
**Effort:** 8-10 hours  
**When:** Vault Mode production release

**Tasks:**
- [ ] Design key rotation mechanism
- [ ] Implement re-encryption on rotation
- [ ] Add rotation schedule
- [ ] Test migration scenarios

---

#### 9.2 Multi-Device Sync Encryption
**Priority:** HIGH  
**Effort:** 15-20 hours  
**When:** Sync feature development

**Tasks:**
- [ ] Design E2E encryption for sync
- [ ] Implement key exchange protocol
- [ ] Add device pairing
- [ ] Test cross-device scenarios

---

#### 9.3 Hardware Security Module Integration
**Priority:** LOW  
**Effort:** 20+ hours  
**When:** Enterprise features

**Tasks:**
- [ ] Research HSM options for browser extensions
- [ ] Design integration architecture
- [ ] Implement secure key storage
- [ ] Add enterprise configuration

---

### 10. External Validation

#### 10.1 Security Audit
**Priority:** MEDIUM  
**Effort:** External consultant  
**When:** Before public release

**Tasks:**
- [ ] Hire security expert
- [ ] Conduct formal security audit
- [ ] Address findings
- [ ] Document security posture

**References:**
- [security-audit-report.md](file:///home/sandy/projects/_underscore/docs/06-security/security-audit-report.md) recommendations

---

#### 10.2 Penetration Testing
**Priority:** MEDIUM  
**Effort:** External consultant  
**When:** Before production release

**Tasks:**
- [ ] Hire penetration tester
- [ ] Test encryption implementation
- [ ] Test cross-domain isolation
- [ ] Verify no data leakage

---

## Summary

### By Priority

**HIGH Priority (8-10 hours):**
- Vault Mode integration tests
- Vault Mode E2E tests
- Multi-device sync encryption (future)

**MEDIUM Priority (30-40 hours):**
- Walk/Sprint integration tests
- JSDoc documentation
- Mode-specific documentation
- Full regression suite
- Security audit (external)
- Key rotation (future)

**LOW Priority (20-25 hours):**
- Performance benchmarks
- Mode comparison guide
- Migration guide
- Troubleshooting guide
- Encryption integration tests
- Security hardening
- JSDoc security warnings
- Encryption performance tests

**Total Deferred Effort:** ~80-100 hours

### Quick Wins (< 3 hours each)
1. JSDoc security warnings (1-2 hrs)
2. Domain validation (1-2 hrs)
3. Mode comparison guide (2-3 hrs)
4. Troubleshooting guide (2-3 hrs)

### High-Impact Items
1. Vault Mode integration tests (validates core feature)
2. Full regression suite (ensures stability)
3. Security audit (validates security claims)

---

**Document Maintained By:** Phase 5 Team  
**Last Updated:** 2026-01-02  
**Next Review:** Before Phase 6 planning
