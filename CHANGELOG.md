# Changelog

All notable changes to the Underscore Web Highlighter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Sprint Mode Release] - 2026-01-02

### Added
- **Sprint Mode** with 4-hour TTL auto-deletion
- Domain-based encryption (AES-256-GCM)
- Event sourcing for persistence
- Cross-domain isolation
- 122 tests (100% passing)

### Features
- ✅ Encrypted local storage (`chrome.storage.local`)
- ✅ 4-hour TTL with automatic cleanup
- ✅ Cross-session persistence (survives page reload & browser restart)
- ✅ Undo/redo support
- ✅ Domain-scoped encryption keys
- ✅ No account required
- ✅ Privacy-first design (no cloud sync, auto-deletion)

### Security
- AES-256-GCM encryption for all stored data
- PBKDF2 key derivation (100,000 iterations)
- Random IV per encryption (forward secrecy)
- Cross-domain isolation validated
- Tampering detection via authentication tags
- Domain-specific encryption keys

### Testing
- 98 unit tests (Walk Mode, Sprint Mode, Crypto Utils)
- 24 integration tests (Storage, TTL, Cross-Session, Error Recovery, Performance)
- All tests passing (100%)
- Performance validation complete

### Documentation
- Comprehensive JSDoc on all public APIs
- Security warnings and guarantees
- Usage examples in code
- Performance benchmarks documented
- README updated with Sprint Mode section

### Technical Details
- **Storage:** `chrome.storage.local` with event sourcing
- **Encryption:** AES-256-GCM with domain-scoped keys
- **TTL:** 4-hour automatic expiration
- **Capacity:** ~5MB per domain (browser quota)
- **Performance:** Handles 100+ highlights efficiently

---

## [0.1.0] - 2025-12-XX

### Added
- Initial project setup
- TypeScript strict configuration
- ESLint & Prettier setup
- Vitest configuration
- Playwright configuration
- Logger implementation
- Error handling framework
- Walk Mode (ephemeral highlighting)

### Infrastructure
- Project structure established
- Quality framework defined
- Testing infrastructure
- CI/CD foundation
