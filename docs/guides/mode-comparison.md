# Mode Comparison Guide

**Last Updated:** 2026-01-02  
**Status:** Current (Walk Mode + Sprint Mode implemented, Vault Mode planned)

---

## Quick Comparison

| Feature | Walk Mode | Sprint Mode | Vault Mode* |
|---------|-----------|-------------|-------------|
| **Persistence** | None (memory only) | 4 hours | Permanent |
| **Storage** | RAM | chrome.storage.local | IndexedDB + Cloud |
| **Encryption** | N/A | ✅ AES-256-GCM | ✅ AES-256-GCM |
| **Cross-device** | ❌ | ❌ | ✅ |
| **Undo/Redo** | ❌ | ✅ | ✅ |
| **Use Case** | Quick reading | Research session | Long-term study |
| **Privacy** | Maximum | High | Medium |
| **Storage Quota** | 0 | ~5MB/domain | Unlimited |
| **Account Required** | ❌ | ❌ | ✅ |

*Vault Mode coming soon

---

## When to Use Each Mode

### Walk Mode: "Incognito Highlighting"

**Philosophy:** Zero trace, maximum privacy

**Best for:**
- Quick article reading
- Privacy-sensitive content
- Temporary annotations
- No commitment needed
- Testing/experimenting

**Characteristics:**
- ✅ Highlights disappear on page close
- ✅ Zero storage footprint
- ✅ Fastest performance
- ✅ No persistence overhead
- ✅ Maximum privacy (nothing saved)

**Limitations:**
- ❌ Lost on page reload
- ❌ Lost on browser restart
- ❌ No undo/redo
- ❌ Can't share across tabs

**Example Use Cases:**
- Reading news articles during lunch break
- Highlighting sensitive documents
- Quick reference while coding
- Temporary study notes

---

### Sprint Mode: "Use and Forget"

**Philosophy:** Temporary persistence with auto-cleanup

**Best for:**
- Research sessions (2-4 hours)
- Multi-tab workflows
- Temporary projects
- Privacy-conscious users
- Cross-session continuity

**Characteristics:**
- ✅ Auto-deletion after 4 hours
- ✅ Survives page reload
- ✅ Survives browser restart
- ✅ Encrypted storage
- ✅ No account required
- ✅ Undo/redo support
- ✅ Cross-domain isolation

**Limitations:**
- ❌ 4-hour TTL (auto-delete)
- ❌ No cross-device sync
- ❌ ~5MB storage limit per domain
- ❌ Lost after TTL expires

**Example Use Cases:**
- Research paper reading session
- Multi-tab documentation review
- Temporary project notes
- Study session (2-4 hours)
- Code review across multiple files

---

### Vault Mode: "Permanent Archive"

**Philosophy:** Long-term knowledge management

**Best for:**
- Long-term research
- Cross-device access
- Permanent annotations
- Organized collections
- Knowledge base building

**Characteristics:**
- ✅ Permanent storage
- ✅ Cloud sync (optional)
- ✅ Advanced organization
- ✅ Cross-device access
- ✅ Unlimited storage
- ✅ Collections/folders
- ✅ Search and filter

**Limitations:**
- ❌ Requires account
- ❌ Slightly slower (cloud sync)
- ❌ Medium privacy (cloud storage)

**Example Use Cases:**
- PhD research notes
- Long-term learning projects
- Professional knowledge base
- Cross-device study materials
- Permanent reference library

---

## Decision Tree

```
Do you need highlights after closing the page?
├─ No → Walk Mode
└─ Yes
    ├─ Only for a few hours? → Sprint Mode
    └─ Permanently? → Vault Mode
```

**Alternative Decision Path:**

```
How long do you need the highlights?
├─ Current session only → Walk Mode
├─ A few hours (2-4h) → Sprint Mode
└─ Forever → Vault Mode
```

**Privacy-First Decision:**

```
How important is privacy?
├─ Maximum (nothing saved) → Walk Mode
├─ High (local encrypted) → Sprint Mode
└─ Medium (cloud storage) → Vault Mode
```

---

## Performance Comparison

### Creation Performance

| Metric | Walk | Sprint | Vault |
|--------|------|--------|-------|
| Create 1 highlight | <10ms | <50ms | <100ms |
| Create 100 highlights | <1s | <5s | <10s |
| Deduplication check | Instant | <50ms | <100ms |

### Restoration Performance

| Metric | Walk | Sprint | Vault |
|--------|------|--------|-------|
| Page load (empty) | Instant | Instant | Instant |
| Page load (10 highlights) | N/A | <100ms | <200ms |
| Page load (100 highlights) | N/A | <1s | <2s |

### Memory Usage

| Metric | Walk | Sprint | Vault |
|--------|------|--------|-------|
| 10 highlights | ~1MB | ~2MB | ~3MB |
| 100 highlights | ~5MB | ~10MB | ~15MB |
| 1000 highlights | ~50MB | ~100MB | ~150MB |

### Storage Quota

| Metric | Walk | Sprint | Vault |
|--------|------|--------|-------|
| Per domain | 0 | ~5MB | Unlimited |
| Total | 0 | ~50MB (10 domains) | Unlimited |

---

## Feature Comparison

### Highlighting Features

| Feature | Walk | Sprint | Vault |
|---------|------|--------|-------|
| Text selection | ✅ | ✅ | ✅ |
| Color options | ✅ | ✅ | ✅ |
| Multiple colors | ✅ | ✅ | ✅ |
| Deduplication | ✅ | ✅ | ✅ |
| Undo/Redo | ❌ | ✅ | ✅ |
| Delete individual | ✅ | ✅ | ✅ |
| Clear all | ✅ | ✅ | ✅ |

### Persistence Features

| Feature | Walk | Sprint | Vault |
|---------|------|--------|-------|
| Page reload | ❌ | ✅ | ✅ |
| Browser restart | ❌ | ✅ | ✅ |
| Cross-device | ❌ | ❌ | ✅ |
| Auto-cleanup | ✅ (instant) | ✅ (4h TTL) | ❌ |
| Manual backup | ❌ | ❌ | ✅ |

### Privacy & Security

| Feature | Walk | Sprint | Vault |
|---------|------|--------|-------|
| Local storage only | ✅ | ✅ | ❌ |
| Encryption | N/A | ✅ AES-256-GCM | ✅ AES-256-GCM |
| Cross-domain isolation | ✅ | ✅ | ✅ |
| No cloud sync | ✅ | ✅ | ❌ |
| Account required | ❌ | ❌ | ✅ |
| Tampering detection | N/A | ✅ | ✅ |

---

## Migration Between Modes

### Walk → Sprint

**Process:**
- Highlights are lost (Walk is ephemeral)
- Must recreate highlights in Sprint Mode
- No automatic migration

**Recommendation:**
- Start new session in Sprint Mode
- Re-highlight important content

---

### Sprint → Vault

**Process:**
1. Export highlights from Sprint Mode (before TTL expires)
2. Import to Vault Mode
3. Highlights become permanent

**Recommendation:**
- Export before 4-hour TTL expires
- Use for long-term research

---

### Vault → Sprint

**Process:**
- Not recommended (data loss)
- Vault is for permanent storage

**Recommendation:**
- Keep in Vault Mode
- Use Sprint Mode for new temporary sessions

---

## Common Scenarios

### Scenario 1: Quick News Reading
**Recommended:** Walk Mode  
**Why:** No need for persistence, maximum privacy

### Scenario 2: Research Paper (2-3 hours)
**Recommended:** Sprint Mode  
**Why:** Survives page reload, auto-cleanup after session

### Scenario 3: PhD Thesis Research
**Recommended:** Vault Mode  
**Why:** Long-term storage, cross-device access

### Scenario 4: Code Review Session
**Recommended:** Sprint Mode  
**Why:** Multi-tab support, 4-hour window sufficient

### Scenario 5: Privacy-Sensitive Documents
**Recommended:** Walk Mode  
**Why:** Zero trace, nothing saved

### Scenario 6: Building Knowledge Base
**Recommended:** Vault Mode  
**Why:** Permanent storage, organization features

---

## Technical Details

### Walk Mode
- **Storage:** RAM only
- **Lifecycle:** Page session
- **Cleanup:** Automatic on page close
- **Performance:** Fastest (no I/O)

### Sprint Mode
- **Storage:** `chrome.storage.local`
- **Encryption:** AES-256-GCM with domain-scoped keys
- **Key Derivation:** PBKDF2 (100,000 iterations)
- **TTL:** 4 hours from creation
- **Cleanup:** Automatic on TTL expiration
- **Performance:** Fast (local storage)

### Vault Mode (Planned)
- **Storage:** IndexedDB + Cloud
- **Encryption:** AES-256-GCM end-to-end
- **Sync:** Optional cloud sync
- **Organization:** Collections, tags, folders
- **Performance:** Good (with caching)

---

## FAQ

**Q: Can I switch modes mid-session?**  
A: Yes, but Walk Mode highlights will be lost. Sprint/Vault highlights persist.

**Q: What happens to Sprint Mode highlights after 4 hours?**  
A: They are automatically deleted. No manual cleanup needed.

**Q: Can I extend Sprint Mode TTL?**  
A: No, 4-hour TTL is fixed. Use Vault Mode for permanent storage.

**Q: Which mode is most private?**  
A: Walk Mode (nothing saved) > Sprint Mode (local encrypted) > Vault Mode (cloud storage)

**Q: Can I use multiple modes simultaneously?**  
A: No, only one mode active per page. Switch modes via extension popup.

**Q: What's the storage limit for Sprint Mode?**  
A: ~5MB per domain (browser quota). Typically 500-1000 highlights.

---

## Choosing the Right Mode

**Use Walk Mode if:**
- ✅ You don't need highlights after closing the page
- ✅ Privacy is your top priority
- ✅ You're just browsing/reading quickly

**Use Sprint Mode if:**
- ✅ You need highlights for a few hours
- ✅ You're doing a research session
- ✅ You want auto-cleanup
- ✅ You value privacy but need some persistence

**Use Vault Mode if:**
- ✅ You need permanent storage
- ✅ You want cross-device access
- ✅ You're building a knowledge base
- ✅ You need organization features

---

**Last Updated:** 2026-01-02  
**Version:** 1.0 (Walk + Sprint implemented)
