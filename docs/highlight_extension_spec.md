# Web Highlighter Extension

## Complete Project Specification & Implementation Guide

**Version:** 1.0  
**Date:** December 26, 2025  
**Status:** Ready for Implementation  
**Total Budget:** $5 (Chrome Web Store one-time fee)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision & Goals](#project-vision--goals)
3. [Market Analysis](#market-analysis)
4. [Feature Requirements](#feature-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Technical Bottlenecks & Solutions](#technical-bottlenecks--solutions)
7. [Security Architecture](#security-architecture)
8. [Data Privacy & Compliance](#data-privacy--compliance)
9. [Accessibility Standards](#accessibility-standards)
10. [Psychology & User Engagement](#psychology--user-engagement)
11. [Business Model](#business-model)
12. [Marketing Strategy](#marketing-strategy)
13. [Technology Stack](#technology-stack)
14. [Database Schema](#database-schema)
15. [API Specifications](#api-specifications)
16. [Implementation Roadmap](#implementation-roadmap)
17. [Testing Strategy](#testing-strategy)
18. [Risk Management](#risk-management)
19. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 Project Overview

A browser extension that revolutionizes online reading through **three
intelligent highlighting modes**:

- **🏃 Sprint Mode**: Ephemeral highlighting for focused reading (zero storage,
  zero cost)
- **🔐 Vault Mode**: Persistent storage with smart organization and cross-device
  sync
- **🧠 Gen Mode**: AI-powered insights, mindmaps, and knowledge synthesis

### 1.2 Key Differentiators

| Feature             | Competitors                      | Our Solution                              |
| ------------------- | -------------------------------- | ----------------------------------------- |
| **Flexibility**     | One-size-fits-all                | 3 modes for different use cases           |
| **Privacy**         | Always cloud-synced              | Sprint mode = 100% private                |
| **AI Intelligence** | Whole-page summarization         | User-curated highlights guide AI          |
| **Cost**            | $5-10/month required             | Free tier with generous limits            |
| **Persistence**     | Brittle (breaks on page updates) | Multi-selector strategy (90% reliability) |

### 1.3 Target Market

- **Primary**: Students, researchers, knowledge workers (18-45 years)
- **Secondary**: Casual readers, lifelong learners (25-65 years)
- **Market Size**: 2.65 billion Chrome users, 5-10% actively use reading tools
- **Addressable Market**: ~150 million potential users

### 1.4 Success Metrics (90 Days)

```
Users: 10,000 installs, 5,000 MAU
Engagement: 20 highlights/user, 3 sessions/week
Monetization: 200 paying users, $1,000 MRR
Quality: 4.5+ stars, <2% crash rate
```

---

## 2. Project Vision & Goals

### 2.1 Vision Statement

> "Transform online reading from passive consumption to active knowledge
> creation through intelligent, flexible highlighting that adapts to how people
> actually read."

### 2.2 Mission

Enable readers to:

1. **Focus** during reading without distractions
2. **Remember** what matters through organized storage
3. **Connect** ideas across articles with AI assistance

### 2.3 Core Principles

```yaml
User-Centric Design:
  - Start simple, grow complex progressively
  - Never force features users don't need
  - Respect user privacy and control

Technical Excellence:
  - Fast (<100ms interaction)
  - Reliable (90%+ highlight restoration)
  - Secure (end-to-end encryption option)

Open & Extensible:
  - Open-source core components
  - Plugin architecture for modes
  - API for integrations
```

### 2.4 Long-Term Goals

**Year 1**: Establish product-market fit, 50k users, $5k MRR  
**Year 2**: Build network effects (collaborative features), 500k users, $50k
MRR  
**Year 3**: Enterprise offering, mobile apps, API marketplace, 2M users

---

## 3. Market Analysis

### 3.1 Competitive Landscape

#### Existing Solutions

**Web Highlights** (100k+ users)

- Strengths: Web Components, PWA dashboard
- Weaknesses: No AI, limited free tier
- Pricing: $4.99/month

**Weava** (500k+ users)

- Strengths: Folder organization, citations
- Weaknesses: Technical debt, stability issues
- Pricing: $7.99/month

**Liner** (500k+ users)

- Strengths: AI integration, social features
- Weaknesses: Poor AI accuracy, removed key features
- Pricing: $8.99/month

**Hypothesis** (Open-source)

- Strengths: Robust anchoring, academic focus
- Weaknesses: Complex UI, no AI
- Pricing: Free (nonprofit)

### 3.2 Market Gap

**Nobody offers**:

1. Mode-based flexibility (Sprint/Vault/Gen)
2. User-curated AI (highlights guide analysis)
3. Privacy-first ephemeral mode
4. Industry-leading persistence (multi-selector)

### 3.3 Competitive Advantages

```yaml
Technical Moat:
  - Multi-selector anchoring (90% reliability vs 70% industry avg)
  - Fuzzy matching with 80% similarity threshold
  - Shadow DOM isolation (no CSS conflicts)

Product Moat:
  - Three distinct modes (hard to copy)
  - Hook model integration (habit formation)
  - Reading analytics (self-improvement narrative)

Cost Moat:
  - $0 infrastructure (free tiers only)
  - Can undercut competition by 50%
  - Generous free tier = viral growth
```

---

## 4. Feature Requirements

### 4.1 Sprint Mode (Ephemeral Highlighting)

#### Core Features

```yaml
Highlighting:
  - Double-tap text to highlight
  - Keyboard shortcut: Ctrl+U (customizable)
  - Auto-contrast color (WCAG AAA compliant)
  - Click highlight to remove
  - Ctrl+Shift+U to clear all

Visual Feedback:
  - Smooth fade-in (200ms)
  - Hover glow effect
  - Count badge: '3 highlights on page'

Storage:
  - In-memory only (JavaScript Map)
  - Zero persistence
  - Auto-cleanup on tab close

Privacy:
  - Nothing leaves browser
  - No API calls
  - No storage used
```

#### User Stories

```
US-SM-001: As a casual reader, I want to highlight text without saving it,
           so I can focus while reading without commitment.

US-SM-002: As a privacy-conscious user, I want highlights to disappear
           automatically, so no reading history is tracked.

US-SM-003: As a power user, I want keyboard shortcuts,
           so I can highlight without interrupting my flow.
```

#### Acceptance Criteria

- [ ] Highlight renders in <100ms
- [ ] Auto-contrast maintains 7:1 ratio
- [ ] All highlights cleared on navigation
- [ ] No data persisted to disk
- [ ] Works on 95% of websites

---

### 4.2 Vault Mode (Persistent Storage)

#### Core Features

```yaml
Storage & Sync:
  - Multi-selector persistence (XPath, Position, Quote)
  - IndexedDB local storage
  - Cloud sync (optional, batched every 30s)
  - Cross-device restoration
  - Conflict resolution (merge strategy)

Organization:
  - Auto-categorize by website
  - Manual collections (drag & drop)
  - Color-coded tags (5 colors + custom)
  - Full-text search
  - Advanced filters (date, domain, color)

Export & Share:
  - Markdown (Obsidian/Notion compatible)
  - HTML with styling
  - PDF with citations
  - JSON for developers
  - Public share links

Restoration:
  - Fuzzy matching (80% similarity threshold)
  - Content fingerprinting (SHA-256)
  - Version tracking (detect article updates)
  - Orphan handling (graceful failures)
```

#### User Stories

```
US-VM-001: As a student, I want to save highlights across articles,
           so I can reference them while writing essays.

US-VM-002: As a researcher, I want to organize highlights by topic,
           so I can find related information quickly.

US-VM-003: As a multi-device user, I want highlights synced automatically,
           so I can continue reading on any device.

US-VM-004: As a knowledge worker, I want to export to Notion,
           so I can integrate with my existing workflow.
```

#### Acceptance Criteria

- [ ] 90% highlight restoration rate
- [ ] Search returns results in <300ms
- [ ] Export completes in <2s for 100 highlights
- [ ] Sync conflict resolution is deterministic
- [ ] Works offline with sync queue

---

### 4.3 Gen Mode (AI-Powered Synthesis)

#### Core Features

```yaml
AI Analysis:
  - Smart summaries (3 lengths: 50/200/500 words)
  - Auto-generated mindmaps (3 layouts: tree/network/timeline)
  - Entity extraction (people, concepts, dates)
  - Cross-document synthesis
  - Contradiction detection

Mindmap Generation:
  - Interactive visualization (D3.js or Markmap)
  - Click node → jump to source
  - Export as SVG/PNG/PDF
  - Color themes (light/dark/colorful)

Smart Features:
  - "Similar highlights" suggestions
  - Gap analysis (missing topics)
  - Question generation (test understanding)
  - Reading pattern insights

Privacy Controls:
  - Highlights only (default)
  - Highlights + context (recommended)
  - Full page (opt-in with warning)
```

#### User Stories

```
US-GM-001: As a deep learner, I want AI to create mindmaps from my highlights,
           so I can visualize connections between ideas.

US-GM-002: As a writer, I want AI to detect contradictions,
           so I can strengthen my arguments.

US-GM-003: As a student, I want AI-generated questions,
           so I can test my understanding.
```

#### Acceptance Criteria

- [ ] Mindmap generation completes in <5s
- [ ] AI summary accuracy >85% (human evaluation)
- [ ] Privacy controls clearly communicated
- [ ] Works with 10+ highlights minimum
- [ ] Handles up to 1000 highlights per analysis

---

### 4.4 Cross-Mode Features

```yaml
Mode Switching:
  - Quick toggle: Ctrl+Shift+M
  - Persistent preference per site
  - Smart suggestions ("Switch to Collect?")
  - Clear visual indicators

Settings:
  - Color customization (per mode)
  - Keyboard shortcuts (customizable)
  - Default mode selection
  - Privacy preferences
  - Export format preferences

Analytics Dashboard:
  - Total highlights over time
  - Most-highlighted sites
  - Reading streaks
  - Time-of-day patterns
  - Word cloud of topics
```

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION                        │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │         CONTENT SCRIPT (Injected Per Tab)          │   │
│  │                                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │   │
│  │  │  Highlight   │  │ Multi-Selector│  │  Mode   │ │   │
│  │  │  Renderer    │  │   Engine      │  │ Manager │ │   │
│  │  │ (Shadow DOM) │  │(XPath+Fuzzy)  │  │(Sprint/ │ │   │
│  │  │              │  │               │  │ Vault/  │ │   │
│  │  │              │  │               │  │  Gen)   │ │   │
│  │  └──────┬───────┘  └───────┬───────┘  └────┬────┘ │   │
│  │         │                  │               │      │   │
│  └─────────┼──────────────────┼───────────────┼──────┘   │
│            │                  │               │          │
│            └──────────┬───────┴───────────────┘          │
│                       │                                  │
│  ┌────────────────────┴──────────────────────────────┐   │
│  │         BACKGROUND SERVICE WORKER                 │   │
│  │                                                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │   │
│  │  │  Storage   │  │   Sync     │  │  AI API    │ │   │
│  │  │  Manager   │  │   Queue    │  │  Client    │ │   │
│  │  │ (IndexedDB)│  │ (Batching) │  │  (Groq)    │ │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │   │
│  └────────┼───────────────┼───────────────┼────────┘   │
│           │               │               │            │
└───────────┼───────────────┼───────────────┼────────────┘
            │               │               │
            │               │               │ HTTPS/WSS
            │               │               │
┌───────────┴───────────────┴───────────────┴────────────┐
│              BACKEND (Cloudflare Workers)               │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  API Gateway │  │ Auth Service │  │  AI Service  │ │
│  │    (Hono)    │  │    (JWT)     │  │   (Claude/   │ │
│  │              │  │              │  │    Groq)     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │         │
│  ┌──────┴─────────────────┴──────────────────┴──────┐  │
│  │          DATA LAYER (Turso / Supabase)           │  │
│  │                                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │  users   │ │highlights│ │  ai_analyses     │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │collections│ │  events  │ │  subscriptions   │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Component Breakdown

#### 5.2.1 Content Script Layer

**Purpose**: Runs in context of every webpage, handles DOM manipulation

**Responsibilities**:

- Detect text selection events
- Render highlights using Shadow DOM
- Restore highlights on page load
- Communicate with background script

**Key Files**:

```
src/content/
  ├── main.ts              // Entry point
  ├── highlighter.ts       // Rendering logic
  ├── selector-engine.ts   // XPath + fuzzy matching
  ├── mode-manager.ts      // Sprint/Vault/Gen logic
  └── dom-observer.ts      // MutationObserver for SPAs
```

#### 5.2.2 Background Service Worker

**Purpose**: Persistent background process, handles storage & sync

**Responsibilities**:

- Manage IndexedDB operations
- Batch sync to cloud (every 30s)
- Handle API requests
- Manage authentication state

**Key Files**:

```
src/background/
  ├── main.ts              // Service worker lifecycle
  ├── storage.ts           // IndexedDB wrapper (Dexie.js)
  ├── sync-queue.ts        // Batch sync logic
  └── api-client.ts        // HTTP client for backend
```

#### 5.2.3 Popup/Options UI

**Purpose**: Extension configuration interface

**Responsibilities**:

- Mode selection
- Settings management
- Analytics dashboard
- Export functionality

**Key Files**:

```
src/popup/
  ├── main.ts              // Popup entry
  ├── components/
  │   ├── mode-switcher.ts // Web Component
  │   ├── settings-panel.ts
  │   └── analytics.ts
  └── styles/
      └── popup.css        // Tailwind utilities
```

### 5.3 Plugin Architecture (Extensibility)

```typescript
// Base mode interface
abstract class HighlightMode {
  abstract highlight(selection: Selection): Promise<void>;
  abstract restore(url: string): Promise<void>;
  abstract cleanup(): void;
}

// Sprint Mode implementation
class SprintMode extends HighlightMode {
  private highlights: Map<string, Highlight> = new Map();

  async highlight(selection: Selection) {
    // In-memory only
    const id = crypto.randomUUID();
    this.highlights.set(id, { selection, timestamp: Date.now() });
  }

  cleanup() {
    this.highlights.clear();
  }
}

// Vault Mode extends Sprint
class VaultMode extends SprintMode {
  private db: Dexie;

  async highlight(selection: Selection) {
    await super.highlight(selection); // Render immediately
    await this.db.highlights.add({...}); // Persist
  }
}

// Gen Mode extends Vault
class GenMode extends VaultMode {
  private aiClient: AIClient;

  async generateMindmap() {
    const highlights = await this.db.highlights.toArray();
    return this.aiClient.analyze(highlights);
  }
}

// Future modes can extend easily
class CollaborateMode extends GenMode {
  // Real-time sync, shared highlights
}
```

---

## 6. Technical Bottlenecks & Solutions

### 6.1 DOM Manipulation Challenges

#### Problem 1: Website CSS Conflicts

**Issue**: Highlights might inherit unwanted styles from host page

**Solution**: Shadow DOM Isolation

```typescript
class HighlightElement extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { background: var(--highlight-color); }
      </style>
      <slot></slot>
    `;
  }
}

customElements.define('app-highlight', HighlightElement);
```

**Benefits**:

- CSS isolation (no conflicts)
- Encapsulated styling
- Reusable component

#### Problem 2: SPA Re-renders

**Issue**: Single-page apps destroy highlights on navigation

**Solution**: MutationObserver + Re-anchoring

```typescript
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length) {
      // DOM changed, re-apply highlights
      reanchorHighlights(mutation.target);
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: false,
});
```

### 6.2 Highlight Persistence Strategy

#### Multi-Selector Approach

Industry standard (used by Hypothesis, Web Highlights):

```typescript
interface HighlightData {
  id: string;
  url: string;
  timestamp: number;

  // Three-tier selector strategy
  selectors: {
    // Tier 1: Fast (XPath + offsets)
    range: {
      startContainer: string; // "/html/body/article[1]/p[3]"
      startOffset: number; // 45
      endContainer: string;
      endOffset: number; // 67
    };

    // Tier 2: Medium (character positions)
    position: {
      start: number; // 2384 (in document.textContent)
      end: number; // 2406
    };

    // Tier 3: Robust (fuzzy text matching)
    quote: {
      prefix: string; // "recent developments in "
      exact: string; // "neural network architecture"
      suffix: string; // " have shown that"
    };
  };

  // Version tracking
  contentHash: string; // SHA-256 of page content
}
```

#### Restoration Algorithm

```typescript
async function restoreHighlight(data: HighlightData, doc: Document) {
  // Strategy 1: XPath (fast, brittle)
  try {
    const range = xpathToRange(data.selectors.range, doc);
    if (verifyText(range, data.selectors.quote.exact)) {
      return { range, confidence: 1.0, method: 'xpath' };
    }
  } catch (e) {
    console.debug('XPath failed, trying position...');
  }

  // Strategy 2: Position (medium speed, brittle to ads)
  try {
    const text = doc.body.textContent;
    const range = createRangeFromPosition(
      text,
      data.selectors.position.start,
      data.selectors.position.end
    );
    if (verifyText(range, data.selectors.quote.exact)) {
      return { range, confidence: 0.9, method: 'position' };
    }
  } catch (e) {
    console.debug('Position failed, using fuzzy match...');
  }

  // Strategy 3: Fuzzy matching (slow, very robust)
  const result = fuzzyTextSearch(
    doc.body,
    data.selectors.quote.prefix,
    data.selectors.quote.exact,
    data.selectors.quote.suffix,
    0.8 // 80% similarity threshold
  );

  if (result) {
    return {
      range: result.range,
      confidence: result.similarity,
      method: 'fuzzy',
    };
  }

  // All strategies failed
  return {
    range: null,
    confidence: 0,
    method: 'failed',
    orphaned: true,
  };
}
```

#### Fuzzy Matching Implementation

Using `google-diff-match-patch` library:

```typescript
import { diff_match_patch } from 'diff-match-patch';

function fuzzyTextSearch(
  root: Node,
  prefix: string,
  exact: string,
  suffix: string,
  threshold: number = 0.8
): { range: Range; similarity: number } | null {
  const dmp = new diff_match_patch();
  const searchText = prefix + exact + suffix;
  const bodyText = root.textContent;

  // Find approximate match
  const matches = dmp.match_main(bodyText, searchText, 0);

  if (matches === -1) return null;

  // Calculate similarity
  const foundText = bodyText.substr(matches, searchText.length);
  const diffs = dmp.diff_main(searchText, foundText);
  const similarity = 1 - dmp.diff_levenshtein(diffs) / searchText.length;

  if (similarity < threshold) return null;

  // Create range from match
  const range = createRangeFromOffset(root, matches, matches + exact.length);

  return { range, similarity };
}
```

### 6.3 Dynamic Site Detection

```typescript
// Detect if site is SPA
function detectSPA(): boolean {
  // Check for common SPA frameworks
  const indicators = [
    !!window.React,
    !!window.Vue,
    !!window.Angular,
    document.querySelector('[ng-app]'),
    document.querySelector('[data-reactroot]'),
    document.querySelector('[data-v-]'),
  ];

  return indicators.some(Boolean);
}

// Adjust observation strategy
if (detectSPA()) {
  // More aggressive re-anchoring
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true, // Watch text changes too
  });
} else {
  // Lighter observation
  observer.observe(document.body, {
    childList: true,
    subtree: false,
  });
}
```

### 6.4 Version Tracking

#### Content Fingerprinting

```typescript
async function getContentFingerprint(doc: Document): Promise<string> {
  // Extract main content (ignore ads, headers, footers)
  const main = doc.querySelector('article, main, .content') || doc.body;
  const text = main.textContent.trim().replace(/\s+/g, ' ');

  // Hash content
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Store with highlight
const highlight: HighlightData = {
  // ...
  contentHash: await getContentFingerprint(document),
  pageTitle: document.title,
  timestamp: Date.now(),
};

// On return visit
const currentHash = await getContentFingerprint(document);
if (currentHash !== highlight.contentHash) {
  console.warn('Page content changed since highlight');
  // Attempt fuzzy restoration with warning
}
```

### 6.5 Conflict Resolution

#### Merge Strategy for Cross-Device Sync

```typescript
interface SyncConflict {
  local: HighlightData;
  remote: HighlightData;
  type: 'metadata' | 'overlapping' | 'deleted';
}

function resolveConflict(conflict: SyncConflict): HighlightData {
  switch (conflict.type) {
    case 'metadata':
      // Same highlight, different colors/tags
      // Newest wins
      return conflict.local.timestamp > conflict.remote.timestamp
        ? conflict.local
        : conflict.remote;

    case 'overlapping':
      // Different highlights at same position
      // Keep both, adjust positions slightly
      return [conflict.local, adjustPosition(conflict.remote)];

    case 'deleted':
      // One device deleted, other modified
      // Modified wins (deletion might be accidental)
      return conflict.local.deleted ? conflict.remote : conflict.local;

    default:
      // Unknown conflict type, last-write-wins
      return conflict.local.timestamp > conflict.remote.timestamp
        ? conflict.local
        : conflict.remote;
  }
}
```

### 6.6 Performance Optimization

#### Virtual Scrolling for Large Libraries

```typescript
class VirtualHighlightList {
  private itemHeight = 80; // px
  private buffer = 5;
  private visible: HighlightData[] = [];

  updateVisibleItems(scrollTop: number, containerHeight: number) {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / this.itemHeight);

    // Add buffer
    const start = Math.max(0, startIndex - this.buffer);
    const end = Math.min(this.highlights.length, endIndex + this.buffer);

    this.visible = this.highlights.slice(start, end);
    this.render();
  }

  render() {
    // Only render visible items
    this.container.innerHTML = this.visible
      .map((h) => this.renderHighlight(h))
      .join('');
  }
}
```

---

## 7. Security Architecture

### 7.1 Threat Model

```yaml
Threats:
  - XSS (Cross-Site Scripting)
  - Data exfiltration
  - Man-in-the-middle attacks
  - Supply chain attacks (malicious dependencies)
  - Privilege escalation
  - Data leakage through export
```

### 7.2 Security Measures

#### 7.2.1 Content Security Policy (CSP)

```json
// manifest.json
{
  "manifest_version": 3,
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.anthropic.com https://api.groq.com; style-src 'self' 'unsafe-inline'"
  }
}
```

**Key Restrictions**:

- No inline scripts (prevents XSS)
- Only allow connections to whitelisted APIs
- No eval() or Function() constructor
- Self-hosted resources only

#### 7.2.2 Input Sanitization

```typescript
import DOMPurify from 'dompurify';

function sanitizeUserInput(input: string): string {
  // Remove all HTML tags, scripts, event handlers
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [],
  });
}

// Usage
const note = sanitizeUserInput(userInput);
await db.highlights.add({ ...highlight, note });
```

#### 7.2.3 Secure Storage

```typescript
// Encrypt sensitive data before storage
import { importKey, encrypt, decrypt } from './crypto';

async function storeAuthToken(token: string) {
  const key = await importKey(userPassword);
  const encrypted = await encrypt(token, key);

  // Store encrypted in IndexedDB, NOT localStorage
  await db.credentials.put({
    id: 'auth_token',
    value: encrypted,
    iv: encrypted.iv,
  });
}

// Encryption implementation
async function encrypt(data: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return { ciphertext, iv };
}
```

#### 7.2.4 API Communication

```typescript
// Only HTTPS, no HTTP
const API_BASE = 'https://api.yourdomain.com';

async function apiRequest(endpoint: string, data: any) {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // CSRF protection
      'X-CSRF-Token': await getCSRFToken(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
```

### 7.3 Dependency Security

```yaml
Automated Scanning:
  Tool: npm audit (built-in)
  Schedule: Every commit (GitHub Actions)
  Action: Fail build if high/critical vulnerabilities

Manual Review:
  Frequency: Before adding any dependency
  Checklist:
    - Check npm download stats (popularity)
    - Review GitHub stars/activity
    - Check last update date
    - Scan for known issues
    - Verify maintainer reputation

Minimal Dependencies:
  Current count: ~15 dependencies
  Target: <20 total dependencies
  Principle: Every dependency is a liability
```

### 7.4 Permission Model

```json
// manifest.json - Minimal permissions
{
  "permissions": [
    "storage", // For IndexedDB
    "activeTab" // For current tab only
  ],
  "optional_permissions": [
    "tabs" // Only if user enables sync
  ],
  "host_permissions": ["https://api.anthropic.com/*", "https://api.groq.com/*"]
}
```

**Principle of Least Privilege**:

- Request minimal permissions
- Optional permissions for advanced features
- Explain why each permission is needed

---

## 8. Data Privacy & Compliance

### 8.1 GDPR Compliance

#### Data Collection Inventory

```yaml
Personal Data Collected:
  Essential:
    - Email address (for account)
    - Highlighted text (user content)
    - Website URLs (where highlights exist)
    - Timestamps (when highlights created)

  Optional (with consent):
    - Reading patterns (for analytics)
    - AI analysis results
    - Device information (for sync)

Legal Basis:
  - Contract (service provision)
  - Consent (optional features)
  - Legitimate interest (product improvement)
```

#### User Rights Implementation

```typescript
// Right to Access (export all data)
async function exportAllUserData(userId: string) {
  const data = {
    account: await db.users.get(userId),
    highlights: await db.highlights.where({ userId }).toArray(),
    collections: await db.collections.where({ userId }).toArray(),
    analyses: await db.ai_analyses.where({ userId }).toArray(),
  };

  return JSON.stringify(data, null, 2);
}

// Right to Erasure (delete all data)
async function deleteAllUserData(userId: string) {
  await db.transaction(
    'rw',
    [db.users, db.highlights, db.collections],
    async () => {
      await db.highlights.where({ userId }).delete();
      await db.collections.where({ userId }).delete();
      await db.ai_analyses.where({ userId }).delete();
      await db.users.delete(userId);
    }
  );

  // Also delete from cloud
  await apiRequest('/api/v1/users/delete', { userId });
}

// Right to Portability (machine-readable format)
async function exportMachineReadable(userId: string) {
  const data = await exportAllUserData(userId);
  return new Blob([data], { type: 'application/json' });
}
```

### 8.2 Privacy Policy (Required)

**Free Tool**: Termly.io Privacy Policy Generator

**Required Sections**:

```
1. Information We Collect
   - User account data
   - Highlighted text and URLs
   - Optional: reading analytics

2. How We Use Information
   - Provide highlighting service
   - Sync across devices
   - AI analysis (with consent)

3. Data Storage
   - Local: IndexedDB (browser)
   - Cloud: Encrypted database
   - Retention: Until user deletes

4. Third-Party Services
   - AI APIs (Groq, Claude)
   - Analytics (Plausible - privacy-friendly)
   - No advertising networks

5. User Rights
   - Access your data (export)
   - Delete your data (erasure)
   - Opt-out of analytics
   - Data portability

6. Security Measures
   - Encryption in transit (HTTPS)
   - Encryption at rest (optional)
   - Regular security audits

7. Contact Information
   - Email: privacy@yourdomain.com
   - Response time: 48 hours
```

### 8.3 CCPA Compliance

```yaml
Required Disclosures:
  - "Do Not Sell My Personal Information" link
  - Categories of data collected
  - Purpose of collection
  - Right to opt-out

Implementation:
  - Settings toggle: "Do Not Share Data with AI"
  - Annual privacy policy review
  - User data deletion within 45 days
```

### 8.4 Cookie Consent

```html
<!-- Simple consent banner -->
<div id="cookie-consent" style="display:none;">
  <p>
    We use essential cookies for functionality. Optional analytics help improve
    our service.
  </p>
  <button id="accept-all">Accept All</button>
  <button id="essential-only">Essential Only</button>
  <a href="/privacy">Privacy Policy</a>
</div>

<script>
  // Show banner if no consent recorded
  if (!localStorage.getItem('cookie-consent')) {
    document.getElementById('cookie-consent').style.display = 'block';
  }
</script>
```

---

## 9. Accessibility Standards

### 9.1 WCAG 2.1 Level AA Compliance

#### Keyboard Navigation

```typescript
// All interactive elements must be keyboard accessible
class HighlightUI {
  setupKeyboardNavigation() {
    // Tab through highlights
    this.highlights.forEach((el, index) => {
      el.tabIndex = 0;
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          this.selectHighlight(index);
        }
        if (e.key === 'ArrowDown') {
          this.focusNext(index);
        }
        if (e.key === 'ArrowUp') {
          this.focusPrevious(index);
        }
      });
    });
  }
}
```

**Global Keyboard Shortcuts**:

```
Ctrl+U          Highlight selected text
Ctrl+Shift+U    Clear all highlights
Ctrl+Shift+M    Switch mode
Escape          Close modal/panel
Tab             Navigate elements
Enter/Space     Activate button
/               Focus search
```

#### Screen Reader Support

```html
<!-- Proper ARIA labels -->
<button
  aria-label="Highlight selected text"
  aria-describedby="highlight-help"
  role="button"
>
  Highlight
</button>

<div id="highlight-help" role="tooltip">
  Double-tap text or press Ctrl+U to highlight
</div>

<!-- Live regions for dynamic updates -->
<div aria-live="polite" aria-atomic="true">
  <p>3 highlights saved</p>
</div>

<!-- Proper heading hierarchy -->
<h1>Vault Mode</h1>
<h2>Collections</h2>
<h3>Work Projects</h3>
```

#### Color Contrast

```css
/* Minimum 4.5:1 for normal text, 7:1 for large text */
:root {
  --highlight-bg: #ffeb3b; /* Yellow */
  --highlight-text: #000; /* Black - 16:1 ratio ✓ */

  --button-bg: #1976d2; /* Blue */
  --button-text: #fff; /* White - 4.5:1 ratio ✓ */
}

/* Auto-adjust for user preferences */
@media (prefers-contrast: high) {
  :root {
    --highlight-bg: #ffff00;
    --button-bg: #0d47a1;
  }
}
```

#### Focus Indicators

```css
/* Visible focus for keyboard users */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #1976d2;
  outline-offset: 2px;
}

/* Don't show for mouse users */
button:focus:not(:focus-visible) {
  outline: none;
}
```

### 9.2 Testing Checklist

```yaml
Automated Tests (Free Tools):
  - WAVE browser extension
  - axe DevTools
  - Lighthouse audit

Manual Tests:
  Keyboard Navigation:
    - [ ] Unplug mouse, navigate entire extension
    - [ ] All features accessible via keyboard
    - [ ] Focus order is logical
    - [ ] No keyboard traps

  Screen Reader (NVDA/VoiceOver):
    - [ ] All text is read correctly
    - [ ] Button purposes are clear
    - [ ] Dynamic updates announced
    - [ ] Form labels properly associated

  Visual:
    - [ ] Text resizable to 200%
    - [ ] No horizontal scrolling at 320px
    - [ ] Color not sole indicator
    - [ ] Contrast ratios meet WCAG AA
```

---

## 10. Psychology & User Engagement

### 10.1 Hook Model Implementation

Based on Nir Eyal's "Hooked" framework:

#### Trigger Phase

```yaml
External Triggers (Initial):
  - Installation confirmation email
  - Browser toolbar icon (visual reminder)
  - First-visit tutorial
  - Weekly email digest

Internal Triggers (Developed over time):
  - Boredom while reading → Highlight for engagement
  - Fear of forgetting → Save to Vault
  - Curiosity about patterns → Check analytics
  - FOMO (seeing others' highlights) → Join community
```

#### Action Phase

**Make it Easy (Reduce Friction)**:

```typescript
// Sprint Mode: Zero friction
// Just double-tap → immediate highlight
function enableSprintMode() {
  document.addEventListener('dblclick', (e) => {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      highlightSelection(selection); // <100ms
    }
  });
}

// Vault Mode: One extra click
function enableVaultMode() {
  // After highlighting, show save button
  showToast('Highlight saved ✓', 2000);
}
```

#### Variable Reward Phase

```yaml
Rewards of the Hunt (Unpredictable Content):
  - 'You highlighted this 3 months ago - remember?'
  - Random old highlights resurfaced
  - "Similar highlight from last week's article"
  - Weekly surprise: 'Your most profound highlight'

Rewards of the Self (Mastery & Competence):
  - Reading streak: '7 days! Keep it up 🔥'
  - Milestones: '100 highlights saved!'
  - Analytics: 'You read 30% more this month'
  - Leaderboard: 'Top 10% most active readers'

Rewards of the Tribe (Social Validation):
  - '12 people highlighted this same passage'
  - 'Your mindmap was shared 5 times'
  - 'Join 50 others researching AI ethics'
```

Implementation:

```typescript
// Spaced repetition - variable schedule
async function scheduleHighlightReminder(highlight: Highlight) {
  const intervals = [1, 3, 7, 14, 30]; // days
  const random = intervals[Math.floor(Math.random() * intervals.length)];

  setTimeout(
    async () => {
      showNotification({
        title: 'Remember this?',
        body: highlight.text.slice(0, 100) + '...',
        action: 'View highlight',
      });
    },
    random * 24 * 60 * 60 * 1000
  );
}
```

#### Investment Phase

**Increase Commitment Over Time**:

```yaml
Small Investments (Week 1-2):
  - Add color to highlight (2 seconds)
  - Add tag (5 seconds)
  - Create collection (10 seconds)

Medium Investments (Week 3-8):
  - Organize 50+ highlights
  - Customize shortcuts
  - Write notes on highlights
  - Export to Notion (workflow integration)

Large Investments (Month 3+):
  - 500+ highlights (data lock-in)
  - Custom mindmaps (intellectual property)
  - Invite colleagues (social commitment)
  - Integration with tools (switching cost)

Result: Each investment makes leaving harder
```

### 10.2 Gamification Elements

```yaml
Progress Tracking:
  - Highlight count: "127 highlights saved"
  - Reading streaks: "14-day streak 🔥"
  - Weekly goals: "Goal: 20 highlights - 15/20"

Achievements (Unlock at milestones):
  - "First Highlight" (1 highlight)
  - "Getting Started" (10 highlights)
  - "Dedicated Reader" (100 highlights)
  - "Knowledge Curator" (500 highlights)
  - "Master Scholar" (1000 highlights)

Visual Progress:
  - XP bar for next achievement
  - Badges in profile
  - Calendar heatmap (GitHub-style)

Social Proof:
  - "Join 50,000 active readers"
  - "10,000 mindmaps created today"
  - "You're more active than 78% of users"
```

### 10.3 Habit Formation

**Goal**: Make highlighting automatic (30-day habit loop)

**Strategy**:

```yaml
Week 1: Awareness
  - Daily reminder: "Try highlighting one article today"
  - Tutorial tooltips on first few uses
  - Celebrate first 5 highlights

Week 2: Practice
  - Gentle nudge: "You highlighted 3 times yesterday!"
  - Show progress: "7-day streak started"
  - Variable reward: Random old highlight resurfaced

Week 3: Consistency
  - Streak protection: "Don't break your 14-day streak!"
  - Analytics: "You read more on Tuesdays"
  - Habit stacking: "Highlight after coffee?"

Week 4: Automation
  - Habit formed: Highlighting feels natural
  - Reduce notifications
  - Shift to internal triggers
```

---

## 11. Business Model

### 11.1 Pricing Strategy

```yaml
SPRINT MODE - Free Forever:
  Price: $0
  Features:
    - Unlimited ephemeral highlights
    - All color options
    - Keyboard shortcuts
    - No ads, no tracking
  Purpose: Viral growth engine

VAULT MODE - Freemium:
  Free Tier:
    Price: $0
    Limits:
      - 50 highlights/month
      - 1 device only
      - Basic export (Markdown)
      - Local storage only

  Pro Tier:
    Price: $5/month or $50/year (17% discount)
    Features:
      - Unlimited highlights
      - Cross-device sync
      - All export formats (PDF, HTML, JSON)
      - Advanced search
      - Reading analytics
      - Collections & tags
      - Priority support

GEN MODE - Premium:
  Price: $10/month or $100/year (17% discount)
  Features:
    - All Pro features
    - 25 AI analyses/month
    - Auto-generated mindmaps
    - Cross-document synthesis
    - Smart connections
    - Question generation
    - Priority AI processing

ULTIMATE - Enterprise:
  Price: $20/month or $200/year
  Features:
    - All Premium features
    - Unlimited AI analyses
    - Team collaboration (up to 10 members)
    - API access
    - Custom integrations
    - Dedicated support
    - SSO (Single Sign-On)
```

### 11.2 Revenue Projections

**Conservative Scenario**:

```
Year 1:
  Total Users: 50,000
  Free: 47,500 (95%)
  Pro ($5): 1,000 (2%) = $5,000/mo
  Premium ($10): 400 (0.8%) = $4,000/mo
  Ultimate ($20): 100 (0.2%) = $2,000/mo

  Total MRR: $11,000
  Annual Revenue: $132,000

Costs:
  Infrastructure: $500/mo = $6,000/yr
  Tools & Services: $100/mo = $1,200/yr
  Total Costs: $7,200/yr

  Net Profit: $124,800/yr
```

**Optimistic Scenario**:

```
Year 1:
  Total Users: 200,000
  Conversion: 3% (industry standard with optimization)

  Pro: 4,000 × $5 = $20,000/mo
  Premium: 1,600 × $10 = $16,000/mo
  Ultimate: 400 × $20 = $8,000/mo

  Total MRR: $44,000
  Annual Revenue: $528,000

  Net Profit (after costs): ~$500,000/yr
```

### 11.3 Customer Acquisition Cost (CAC)

**Free Marketing Channels**:

```yaml
Product Hunt: $0 (1,000-5,000 installs)
Reddit Posts: $0 (500-2,000 installs)
Hacker News: $0 (1,000-10,000 installs if viral)
SEO: $0 (time investment only)
Word of Mouth: $0 (referral program)

Average CAC: $0.50 (mostly time, not money)
```

**Paid Marketing** (Optional, if budget allows):

```yaml
Google Ads: $2-5 CPC
  - Target: "web highlighter", "save highlights"
  - Expected CAC: $3-8 per install

Twitter Ads: $1-3 CPC
  - Target: Students, researchers
  - Expected CAC: $2-6 per install

Goal: CAC < $10, LTV > $50 (5:1 ratio)
```

### 11.4 Lifetime Value (LTV)

```yaml
Pro User ($5/month):
  Average subscription: 12 months
  LTV: $60

Premium User ($10/month):
  Average subscription: 18 months
  LTV: $180

Ultimate User ($20/month):
  Average subscription: 24 months
  LTV: $480

Blended LTV: ~$100
LTV:CAC Ratio: 100:1 (exceptional for free marketing)
```

### 11.5 Monetization Strategy

**Phase 1 (Months 1-6): Growth**

- Focus on free users
- No aggressive upselling
- Build trust and habit formation
- Goal: 10,000 MAU

**Phase 2 (Months 7-12): Conversion**

- Introduce Pro features
- Gentle upgrade prompts
- "You've saved 50 highlights - upgrade for unlimited"
- Goal: 2% conversion rate

**Phase 3 (Year 2): Premium Features**

- Roll out Gen Mode (AI features)
- Target power users
- "Generate mindmap from 100 highlights?"
- Goal: 1% premium conversion

**Phase 4 (Year 3): Enterprise**

- Team features
- API access
- Custom integrations
- Goal: 10-20 enterprise customers

---

## 12. Marketing Strategy

### 12.1 Positioning

**Tagline**: "Highlight Your Way - Read Smarter, Remember Everything"

**Value Propositions**:

```
For Students:
  "Study smarter with AI-powered mindmaps from your highlights"

For Researchers:
  "Organize research across dozens of papers effortlessly"

For Knowledge Workers:
  "Build your second brain - never lose an insight again"

For Casual Readers:
  "Focus while reading, no commitment required"
```

### 12.2 Launch Strategy

#### Pre-Launch (2 weeks before)

```yaml
Beta Program:
  - Recruit 100 beta testers
  - Sources: Reddit, Twitter, product communities
  - Offer: Lifetime Pro access for feedback
  - Goal: 50+ testimonials, bug reports

Content Creation:
  - 3 demo videos (30s, 2min, 5min)
  - Landing page with email signup
  - Blog post: 'Why I Built This'
  - Twitter thread: Development journey

Press Kit:
  - High-res screenshots
  - Logo assets
  - Founder story
  - Product fact sheet
```

#### Launch Day

```yaml
Product Hunt:
  Time: Tuesday or Wednesday, 12:01 AM PST
  Post: Founder story + demo video
  Engage: Reply to every comment
  Goal: Top 5 product of the day

Hacker News:
  Post: 'Show HN: I built a smart web highlighter'
  Focus: Technical innovation (multi-selector persistence)
  Link: GitHub repo + live demo

Reddit:
  Subreddits:
    - r/productivity (500k members)
    - r/chrome_extensions (100k)
    - r/getdisciplined (1M)
    - r/studying (500k)
  Approach: Value-first, not promotional
  Example: 'I got frustrated with forgetting what I read, so I built this...'

Twitter:
  - Thread explaining the problem & solution
  - Demo GIF
  - Tag relevant accounts (productivity influencers)
  - Engage with replies

Email List:
  - Send to beta subscribers
  - Personal message from founder
  - Clear CTA: 'Install now'
```

### 12.3 Growth Channels

#### Content Marketing (Weeks 2-12)

```yaml
Blog Posts (SEO):
  - "How to Remember Everything You Read Online"
  - "The Science of Effective Highlighting"
  - "From Highlights to Knowledge: A Complete Guide"
  - Target: "web highlighter", "save highlights" keywords

Guest Posts:
  - Medium publications (Better Humans, The Startup)
  - Dev.to (technical audience)
  - Substack newsletters (productivity niche)

YouTube:
  - "I Built a Browser Extension - Here's What I Learned"
  - "How to Organize Your Highlights Like a Pro"
  - Tutorial series

Podcast Appearances:
  - Indie Hackers podcast
  - Productivity shows
  - EdTech podcasts
```

#### Community Building

```yaml
Discord Server:
  -  #general (community chat)
  -  #feature-requests (user feedback)
  -  #show-and-tell (share mindmaps)
  -  #support (help each other)

GitHub Discussions:
  - Open-source core components
  - Community contributions
  - Transparent roadmap

Twitter Community:
  - Daily tips on effective reading
  - User spotlight (share mindmaps)
  - Weekly threads (engagement)
```

#### Partnerships

```yaml
Tool Integrations:
  - Notion API (export highlights)
  - Obsidian plugin
  - Roam Research compatibility
  - Readwise integration

Educational Institutions:
  - Free Ultimate tier for students
  - Email to university libraries
  - Partner with study groups

Influencer Outreach:
  - Productivity YouTubers (Ali Abdaal, Thomas Frank)
  - Study communities (StudyTube)
  - Academic Twitter
```

### 12.4 Referral Program

```yaml
Mechanics:
  - Share extension link with friends
  - Friend installs and creates 5 highlights
  - Both get 1 month Pro free

Viral Coefficient Goal: 0.3
  (Each user brings 0.3 new users)

  With 10,000 users:
    Next month: +3,000 new users
    Month after: +3,900
    Compounds over time

Implementation:
  - Unique referral links
  - Track installs via link
  - Auto-apply Pro credit
  - Leaderboard for top referrers
```

### 12.5 Paid Advertising (Optional)

**Only if free channels saturate**:

```yaml
Google Ads:
  Budget: $500/month
  Keywords:
    - 'web highlighter'
    - 'save highlights browser'
    - 'reading tool chrome'
  Expected: 200-300 installs/month

Twitter Ads:
  Budget: $300/month
  Target: Students, researchers, knowledge workers
  Format: Promoted tweets with demo video
  Expected: 150-250 installs/month

Reddit Ads:
  Budget: $200/month
  Subreddits: r/productivity, r/studying
  Format: Promoted posts (look native)
  Expected: 100-200 installs/month
```

---

## 13. Technology Stack

### 13.1 Frontend Extension

```yaml
Framework:
  - Vanilla JavaScript + Web Components (Lit 3.x)
  - Reason: <50KB bundle, no framework overhead

Build Tool:
  - Vite 5.x (ultra-fast HMR)
  - wxt.dev 0.17.x (extension framework)
  - Reason: Modern, fast, great DX

UI Components:
  - Custom Web Components
  - Tailwind CSS (utility classes only)
  - Reason: Reusable, lightweight

Storage:
  - IndexedDB (Dexie.js 4.x wrapper)
  - Reason: Unlimited storage, async API

Utilities:
  - google-diff-match-patch 1.0.5 (fuzzy matching)
  - DOMPurify 3.x (XSS prevention)
  - jose 5.x (JWT handling)
```

### 13.2 Backend

```yaml
Runtime:
  - Cloudflare Workers (V8 isolates)
  - Reason: Edge compute, 0ms cold start, free tier

Framework:
  - Hono 4.x (ultra-fast routing)
  - Reason: 3x faster than Express, tiny footprint

Database:
  - Turso (LibSQL) OR Supabase (PostgreSQL)
  - Reason: Generous free tier, edge replication

Authentication:
  - JWT tokens (jose library)
  - Optional: Clerk (10k MAU free)
  - Reason: Stateless, scalable

AI APIs:
  - Groq (fast inference, 14.4k req/day free)
  - Claude API (high quality, prompt caching)
  - Reason: Free tiers, no lock-in
```

### 13.3 Development Tools

```yaml
IDE: VS Code (free)
Version Control: Git + GitHub (free)
CI/CD: GitHub Actions (2,000 min/month free)

Testing:
  - Unit: Vitest 1.x
  - E2E: Playwright 1.x
  - Extension: Puppeteer + chrome-launcher

Monitoring:
  - Errors: Sentry (5k events/month free)
  - Analytics: Plausible Community Edition (self-hosted)
  - Uptime: UptimeRobot (50 monitors free)

Design:
  - Figma (3 files free)
  - OR Penpot (open-source alternative)
```

### 13.4 Infrastructure

```yaml
Backend Hosting:
  - Cloudflare Workers
  - Free Tier: 100k req/day
  - Cost: $0 until 10k+ users

Database:
  - Turso: 500 databases, 1GB storage free
  - OR Supabase: 500MB database, 50k MAU free
  - Cost: $0 until 50k+ highlights

File Storage (for exports):
  - Cloudflare R2 (10GB free)
  - OR Supabase Storage (2GB free)
  - Cost: $0 for MVP

CDN:
  - Cloudflare (always free)
  - jsDelivr (for static assets)
  - Cost: $0

Email:
  - Resend (3k emails/month free)
  - Cost: $0 for MVP

Landing Page:
  - GitHub Pages (free)
  - OR Cloudflare Pages (free)
  - Cost: $0
```

**Total Infrastructure Cost: $0/month** (within free tiers)

---

## 14. Database Schema

### 14.1 Complete Schema (PostgreSQL/LibSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(20) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP
);

-- Highlights table (core data)
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Page metadata
  url VARCHAR(2048) NOT NULL,
  page_title VARCHAR(500),
  domain VARCHAR(255),

  -- Multi-selector strategy
  selector_xpath JSONB,
  -- Example: {"startContainer": "/html/body/article[1]/p[3]", "startOffset": 45, ...}

  selector_position JSONB,
  -- Example: {"start": 2384, "end": 2406}

  selector_quote JSONB NOT NULL,
  -- Example: {"prefix": "recent developments in ", "exact": "neural networks", "suffix": " have shown"}

  -- Content
  highlighted_text TEXT NOT NULL,
  surrounding_context TEXT,

  -- User metadata
  color VARCHAR(7) DEFAULT '#ffeb3b',
  tags TEXT[],
  note TEXT,

  -- Version tracking
  content_hash VARCHAR(64),
  restore_confidence FLOAT, -- 0.0-1.0
  restore_method VARCHAR(20), -- 'xpath' | 'position' | 'fuzzy'

  -- Sync metadata
  device_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,

  -- Indexes for performance
  CONSTRAINT check_confidence CHECK (restore_confidence >= 0 AND restore_confidence <= 1)
);

CREATE INDEX idx_highlights_user_url ON highlights(user_id, url);
CREATE INDEX idx_highlights_created ON highlights(created_at DESC);
CREATE INDEX idx_highlights_hash ON highlights(content_hash);
CREATE INDEX idx_highlights_domain ON highlights(domain);

-- Full-text search (PostgreSQL specific)
CREATE INDEX idx_highlights_text_search
ON highlights USING GIN(to_tsvector('english', highlighted_text || ' ' || COALESCE(note, '')));

-- Collections (folders/categories)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#2196f3',
  icon VARCHAR(50), -- emoji or icon name
  parent_id UUID REFERENCES collections(id), -- for nested collections
  position INTEGER DEFAULT 0, -- for ordering
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_collections_user ON collections(user_id);

-- Highlight-Collection junction (many-to-many)
CREATE TABLE highlight_collections (
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (highlight_id, collection_id)
);

-- AI analyses
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL, -- 'summary' | 'mindmap' | 'connections' | 'questions'

  -- Input
  input_highlight_ids UUID[], -- Array of highlight IDs
  input_urls TEXT[], -- Source URLs

  -- Output
  output_data JSONB NOT NULL,
  -- Example for mindmap: {"nodes": [...], "edges": [...]}
  -- Example for summary: {"short": "...", "medium": "...", "long": "..."}

  -- Metadata
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analyses_user ON ai_analyses(user_id);
CREATE INDEX idx_analyses_type ON ai_analyses(analysis_type);

-- Analytics events (for insights)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  -- 'highlight_created' | 'highlight_deleted' | 'collection_created' | 'export' | 'ai_generated' | 'mode_switched'

  event_data JSONB,
  -- Example: {"mode": "vault", "color": "#ffeb3b", "url": "..."}

  session_id VARCHAR(100),
  device_type VARCHAR(20), -- 'desktop' | 'mobile'
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_user_type ON events(user_id, event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan VARCHAR(20) NOT NULL, -- 'pro' | 'premium' | 'ultimate'
  status VARCHAR(20) NOT NULL, -- 'active' | 'canceled' | 'past_due'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Referrals (for viral growth)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES users(id),
  referred_user_id UUID REFERENCES users(id),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  reward_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id);
```

### 14.2 Sample Queries

```sql
-- Get all highlights for a URL
SELECT * FROM highlights
WHERE user_id = $1 AND url = $2 AND deleted = FALSE
ORDER BY created_at ASC;

-- Full-text search across highlights
SELECT * FROM highlights
WHERE user_id = $1
  AND to_tsvector('english', highlighted_text || ' ' || COALESCE(note, ''))
  @@ plainto_tsquery('english', $2)
ORDER BY created_at DESC
LIMIT 50;

-- Get highlights by collection
SELECT h.* FROM highlights h
JOIN highlight_collections hc ON h.id = hc.highlight_id
WHERE hc.collection_id = $1 AND h.deleted = FALSE
ORDER BY h.created_at DESC;

-- Analytics: Most highlighted domains
SELECT domain, COUNT(*) as count
FROM highlights
WHERE user_id = $1 AND deleted = FALSE
GROUP BY domain
ORDER BY count DESC
LIMIT 10;

-- Analytics: Highlighting activity over time
SELECT DATE(created_at) as date, COUNT(*) as count
FROM highlights
WHERE user_id = $1 AND deleted = FALSE
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;
```

---

## 15. API Specifications

### 15.1 REST API Endpoints

**Base URL**: `https://api.yourdomain.com/v1`

#### Authentication

```
POST /auth/register
Request:
  {
    "email": "user@example.com",
    "password": "secure_password"
  }
Response:
  {
    "user": { "id": "uuid", "email": "..." },
    "token": "jwt_token"
  }

POST /auth/login
Request:
  {
    "email": "user@example.com",
    "password": "secure_password"
  }
Response:
  {
    "user": { "id": "uuid", "email": "...", "subscription_tier": "pro" },
    "token": "jwt_token"
  }

POST /auth/logout
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

#### Highlights

```
POST /highlights
Headers: Authorization: Bearer <token>
Request:
  {
    "url": "https://example.com/article",
    "pageTitle": "Article Title",
    "domain": "example.com",
    "selectors": {
      "xpath": {...},
      "position": {...},
      "quote": {...}
    },
    "highlightedText": "selected text",
    "color": "#ffeb3b",
    "tags": ["ai", "research"],
    "note": "Important finding"
  }
Response:
  {
    "id": "uuid",
    "createdAt": "2025-12-26T10:00:00Z",
    ...
  }

GET /highlights?url=<url>&limit=50&offset=0
Headers: Authorization: Bearer <token>
Response:
  {
    "highlights": [...],
    "total": 127,
    "hasMore": true
  }

PUT /highlights/:id
Headers: Authorization: Bearer <token>
Request:
  {
    "color": "#ff0000",
    "tags": ["ai", "research", "important"],
    "note": "Updated note"
  }
Response:
  {
    "id": "uuid",
    "updatedAt": "2025-12-26T11:00:00Z",
    ...
  }

DELETE /highlights/:id
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

#### Collections

```
POST /collections
Headers: Authorization: Bearer <token>
Request:
  {
    "name": "AI Research",
    "description": "Papers about AI safety",
    "color": "#2196f3",
    "icon": "🤖"
  }
Response:
  {
    "id": "uuid",
    "name": "AI Research",
    ...
  }

GET /collections
Headers: Authorization: Bearer <token>
Response:
  {
    "collections": [...]
  }

POST /collections/:id/highlights
Headers: Authorization: Bearer <token>
Request:
  {
    "highlightIds": ["uuid1", "uuid2", "uuid3"]
  }
Response: 204 No Content
```

#### AI Analysis

```
POST /ai/analyze
Headers: Authorization: Bearer <token>
Request:
  {
    "type": "mindmap", // 'summary' | 'mindmap' | 'connections' | 'questions'
    "highlightIds": ["uuid1", "uuid2", ...],
    "options": {
      "layout": "tree", // 'tree' | 'network' | 'timeline'
      "depth": "medium" // 'shallow' | 'medium' | 'deep'
    }
  }
Response:
  {
    "analysisId": "uuid",
    "type": "mindmap",
    "output": {
      "nodes": [
        { "id": "node1", "label": "Neural Networks", "x": 0, "y": 0 },
        ...
      ],
      "edges": [
        { "from": "node1", "to": "node2", "label": "related to" },
        ...
      ]
    },
    "tokensUsed": 1523,
    "processingTime": 3240
  }

GET /ai/analyses?type=mindmap&limit=10
Headers: Authorization: Bearer <token>
Response:
  {
    "analyses": [...]
  }
```

#### Export

```
POST /export
Headers: Authorization: Bearer <token>
Request:
  {
    "format": "markdown", // 'markdown' | 'html' | 'pdf' | 'json'
    "highlightIds": ["uuid1", "uuid2", ...], // or omit for all
    "collectionId": "uuid" // optional: export specific collection
  }
Response:
  {
    "downloadUrl": "https://cdn.yourdomain.com/exports/uuid.md",
    "expiresAt": "2025-12-27T10:00:00Z"
  }
```

#### Analytics

```
GET /analytics/summary
Headers: Authorization: Bearer <token>
Response:
  {
    "totalHighlights": 1247,
    "highlightsThisMonth": 89,
    "currentStreak": 14,
    "longestStreak": 27,
    "mostHighlightedDomains": [
      { "domain": "medium.com", "count": 342 },
      ...
    ],
    "activityByDay": {
      "2025-12-20": 12,
      "2025-12-21": 8,
      ...
    }
  }
```

### 15.2 Rate Limiting

```yaml
Unauthenticated:
  - 10 requests/minute
  - 100 requests/hour

Free Tier:
  - 100 requests/minute
  - 1,000 requests/hour
  - 10,000 requests/day

Pro Tier:
  - 300 requests/minute
  - 10,000 requests/day

Premium/Ultimate:
  - 1,000 requests/minute
  - Unlimited daily

AI Endpoints:
  Free: 10 analyses/month
  Pro: 25 analyses/month
  Premium: 50 analyses/month
  Ultimate: Unlimited
```

### 15.3 Error Responses

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit. Try again in 30 seconds.",
    "details": {
      "retryAfter": 30,
      "limit": 100,
      "remaining": 0
    }
  }
}
```

**Error Codes**:

- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource doesn't exist
- `CONFLICT`: Resource already exists
- `SERVER_ERROR`: Internal server error

---

## 16. Implementation Roadmap

### 16.1 Pre-Development (Week 1)

**Day 1-2: Legal & Compliance**

- [ ] Generate Privacy Policy (Termly.io)
- [ ] Generate Terms of Service (FreePrivacyPolicy.com)
- [ ] Create cookie consent banner
- [ ] Document data retention policy

**Day 3-4: Infrastructure Setup**

- [ ] GitHub repository + project board
- [ ] Cloudflare Workers account
- [ ] Turso/Supabase database setup
- [ ] Domain registration (optional)
- [ ] Email setup (Resend account)

**Day 5: Security Planning**

- [ ] Configure CSP in manifest.json
- [ ] Set up npm audit in CI/CD
- [ ] Create security checklist
- [ ] Document encryption strategy

**Day 6-7: Design & Planning**

- [ ] Create wireframes (Figma)
- [ ] Design brand identity (logo, colors)
- [ ] Write API specifications
- [ ] Create technical architecture doc

### 16.2 Development Sprint 1-2 (Weeks 2-3)

**Goal: Sprint Mode MVP**

**Week 2: Core Highlighting**

- [ ] Extension boilerplate (wxt.dev)
- [ ] Manifest.json configuration
- [ ] Content script injection
- [ ] Text selection detection
- [ ] Double-tap event handling
- [ ] Basic highlight rendering

**Week 3: Sprint Mode Polish**

- [ ] Shadow DOM implementation
- [ ] Auto-contrast color algorithm
- [ ] Click-to-remove functionality
- [ ] Keyboard shortcuts (Ctrl+U, Ctrl+Shift+U)
- [ ] Mode indicator UI
- [ ] In-memory storage (Map)
- [ ] Cleanup on navigation

**Testing**:

- [ ] Test on 20+ popular websites
- [ ] Performance: <100ms render time
- [ ] Memory: <10MB usage
- [ ] No console errors

### 16.3 Development Sprint 3-4 (Weeks 4-5)

**Goal: Vault Mode Core**

**Week 4: Persistence Layer**

- [ ] IndexedDB schema (Dexie.js)
- [ ] Multi-selector generation
  - [ ] XPath selector
  - [ ] Position selector
  - [ ] Quote selector (prefix/exact/suffix)
- [ ] Content fingerprinting (SHA-256)
- [ ] Storage manager API
- [ ] Background service worker

**Week 5: Restoration Logic**

- [ ] XPath restoration (fast path)
- [ ] Position restoration (medium path)
- [ ] Fuzzy matching (google-diff-match-patch)
- [ ] Confidence scoring
- [ ] Orphan handling
- [ ] MutationObserver for SPAs
- [ ] Re-anchoring on DOM changes

**Testing**:

- [ ] 90%+ restoration rate
- [ ] Test on dynamic sites (Reddit, Twitter)
- [ ] Test article updates (version tracking)

### 16.4 Development Sprint 5-6 (Weeks 6-7)

**Goal: Vault Mode Advanced**

**Week 6: Organization Features**

- [ ] Collections (create, edit, delete)
- [ ] Tags system
- [ ] Color picker (5 presets + custom)
- [ ] Full-text search
- [ ] Advanced filters
- [ ] Library UI (sidebar)
- [ ] Drag-and-drop to collections

**Week 7: Sync & Export**

- [ ] User authentication (JWT)
- [ ] Backend API (Cloudflare Workers + Hono)
- [ ] Sync queue (batch every 30s)
- [ ] Conflict resolution
- [ ] Export to Markdown
- [ ] Export to JSON
- [ ] Export to HTML
- [ ] Public share links

**Testing**:

- [ ] Cross-device sync
- [ ] Offline functionality
- [ ] Export format validation

### 16.5 Development Sprint 7-8 (Weeks 8-9)

**Goal: Polish & Launch Prep**

**Week 8: UI/UX Polish**

- [ ] Onboarding tutorial
- [ ] Settings panel
- [ ] Mode switcher UI
- [ ] Analytics dashboard
  - [ ] Total highlights
  - [ ] Reading streaks
  - [ ] Most highlighted sites
  - [ ] Calendar heatmap
- [ ] Keyboard shortcuts reference
- [ ] Help documentation

**Week 9: Quality Assurance**

- [ ] Security audit (OWASP ZAP)
- [ ] Accessibility audit (WAVE, axe)
- [ ] Performance optimization
  - [ ] Bundle size <70KB
  - [ ] Lazy loading
  - [ ] Virtual scrolling for library
- [ ] Cross-browser testing
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge
- [ ] Bug fixes
- [ ] Error tracking setup (Sentry)

### 16.6 Launch (Week 10)

**Day 1-2: Store Submission**

- [ ] Chrome Web Store listing
  - [ ] Screenshots (5-10)
  - [ ] Promo video (30s)
  - [ ] Description (compelling copy)
  - [ ] Privacy policy link
- [ ] Firefox Add-ons submission
- [ ] Edge Add-ons submission

**Day 3: Marketing Launch**

- [ ] Product Hunt submission (Tuesday 12:01 AM PST)
- [ ] Hacker News "Show HN" post
- [ ] Reddit posts (r/productivity, r/chrome_extensions)
- [ ] Twitter thread
- [ ] Email to beta users

**Day 4-5: Engagement**

- [ ] Reply to all comments
- [ ] Monitor errors (Sentry)
- [ ] Track usage (Plausible)
- [ ] Collect feedback

**Day 6-7: Analysis**

- [ ] Review metrics
- [ ] Prioritize bugs
- [ ] Plan next sprint

### 16.7 Post-Launch (Weeks 11-14)

**Week 11-12: Iterate on Feedback**

- [ ] Fix critical bugs
- [ ] Improve onboarding based on drop-off
- [ ] A/B test pricing messaging
- [ ] Optimize conversion funnel

**Week 13-14: Gen Mode Planning**

- [ ] Define AI feature scope
- [ ] Design mindmap UI
- [ ] Prototype AI prompts
- [ ] Estimate API costs
- [ ] Test with Groq API

**Ongoing**:

- [ ] Weekly blog posts
- [ ] Community engagement (Discord, Twitter)
- [ ] Feature requests prioritization
- [ ] Performance monitoring

---

## 17. Testing Strategy

### 17.1 Unit Tests (Vitest)

```typescript
// Example: Fuzzy matching tests
import { describe, it, expect } from 'vitest';
import { fuzzyTextSearch } from './selector-engine';

describe('Fuzzy Text Matching', () => {
  it('should find exact match', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = fuzzyTextSearch(text, 'quick', 'brown fox', 'jumps');
    expect(result.similarity).toBe(1.0);
  });

  it('should find match with typos (80% threshold)', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = fuzzyTextSearch(text, 'quik', 'brown fox', 'jmps', 0.8);
    expect(result.similarity).toBeGreaterThan(0.8);
  });

  it('should return null if below threshold', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = fuzzyTextSearch(text, 'xyz', 'abc', 'def', 0.8);
    expect(result).toBeNull();
  });
});
```

**Test Coverage Goals**:

- Multi-selector engine: 90%
- Storage manager: 85%
- API client: 80%
- Overall: 75%+

### 17.2 Integration Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('Highlight flow: create, save, restore', async ({ page }) => {
  // Load test page
  await page.goto('https://example.com/article');

  // Select text
  await page.locator('article p').first().dblclick();

  // Verify highlight rendered
  const highlight = page.locator('app-highlight');
  await expect(highlight).toBeVisible();
  await expect(highlight).toHaveCSS('background-color', 'rgb(255, 235, 59)');

  // Save highlight (switch to Vault mode)
  await page.click('[data-testid="mode-switcher"]');
  await page.click('[data-testid="vault-mode"]');

  // Reload page
  await page.reload();

  // Verify highlight restored
  await expect(highlight).toBeVisible();
});
```

**Integration Test Coverage**:

- Sprint Mode: Highlight, remove, clear all
- Vault Mode: Save, restore, sync, export
- Collections: Create, add highlights, organize
- Search: Full-text, filters
- Settings: Change colors, shortcuts

### 17.3 E2E Tests (Critical User Journeys)

```yaml
New User Onboarding:
  1. Install extension
  2. Complete tutorial
  3. Highlight first passage
  4. Create account
  5. Save to Vault

  Success Criteria: <5 minutes, 0 errors

Power User Workflow:
  1. Highlight 10 passages across 3 articles
  2. Organize into 2 collections
  3. Tag with 5 different tags
  4. Search for specific highlight
  5. Export to Markdown

  Success Criteria: <3 minutes, accurate results

Cross-Device Sync:
  1. Highlight on Device A
  2. Wait for sync (30s)
  3. Open on Device B
  4. Verify highlight restored

  Success Criteria: <60s total, 100% accuracy
```

### 17.4 Performance Tests

```yaml
Metrics:
  - Highlight render time: <100ms (p95)
  - Search response time: <300ms (1000 highlights)
  - Extension bundle size: <70KB gzipped
  - Memory usage: <50MB (100 highlights on page)
  - Sync batch time: <2s (50 highlights)

Tools:
  - Lighthouse (performance score >90)
  - Chrome DevTools (profiling)
  - Memory profiler
  - Bundle analyzer (Vite)
```

### 17.5 Security Tests

```yaml
Automated (OWASP ZAP):
  - XSS vulnerability scan
  - CSRF token validation
  - SQL injection (API endpoints)
  - Path traversal
  - Authentication bypass attempts

Manual:
  - Input sanitization (notes, tags)
  - CSP policy effectiveness
  - Dependency vulnerabilities (npm audit)
  - Token storage security
  - API rate limiting

Penetration Testing:
  - Try to access other users' highlights
  - Attempt privilege escalation
  - Test export file security
  - Verify encryption at rest
```

### 17.6 Accessibility Tests

```yaml
Automated (WAVE + axe):
  - Color contrast ratios
  - ARIA labels presence
  - Heading hierarchy
  - Form label associations
  - Alt text for images

Manual:
  Keyboard Navigation:
    - [ ] Tab through all elements
    - [ ] No keyboard traps
    - [ ] Visible focus indicators
    - [ ] Shortcuts documented

  Screen Reader (NVDA):
    - [ ] All text readable
    - [ ] Button purposes clear
    - [ ] Dynamic updates announced
    - [ ] Modal focus management
```

### 17.7 Browser Compatibility

```yaml
Testing Matrix:
  Chrome: v120+ (primary)
  Firefox: v120+
  Edge: v120+
  Safari: v17+ (future)

Test Coverage:
  - Extension installation
  - Highlighting functionality
  - Storage persistence
  - Sync across browsers
  - Export features
```

---

## 18. Risk Management

### 18.1 Technical Risks

| Risk                                           | Probability | Impact   | Mitigation Strategy                                                |
| ---------------------------------------------- | ----------- | -------- | ------------------------------------------------------------------ |
| **Multi-selector fails on new sites**          | High        | Medium   | Graceful degradation, user feedback system, continuous testing     |
| **IndexedDB quota exceeded**                   | Medium      | High     | Cleanup old highlights, cloud backup, user notification            |
| **AI API costs spiral**                        | Medium      | High     | Rate limiting, usage caps, monitor closely                         |
| **Chrome Web Store rejection**                 | Low         | Critical | Follow policies strictly, have appeal process ready                |
| **Performance degrades with 1000+ highlights** | Medium      | Medium   | Virtual scrolling, lazy loading, pagination                        |
| **Security vulnerability discovered**          | Low         | Critical | Bug bounty program, rapid patch process, transparent communication |

### 18.2 Business Risks

| Risk                             | Probability | Impact | Mitigation Strategy                                           |
| -------------------------------- | ----------- | ------ | ------------------------------------------------------------- |
| **Low conversion rate (<1%)**    | Medium      | High   | A/B test pricing, improve onboarding, add social proof        |
| **Competitor copies features**   | High        | Medium | Build network effects, focus on UX, iterate faster            |
| **User churn after free trial**  | High        | High   | Implement hook model, email campaigns, exit surveys           |
| **Negative reviews due to bugs** | Medium      | Medium | Rapid support, proactive communication, quality focus         |
| **Market saturation**            | Low         | High   | Differentiate with AI, target niches, international expansion |

### 18.3 Legal/Compliance Risks

| Risk                              | Probability | Impact   | Mitigation Strategy                                                      |
| --------------------------------- | ----------- | -------- | ------------------------------------------------------------------------ |
| **GDPR violation fine**           | Low         | Critical | Use generator templates, lawyer review at $10k MRR, strict data handling |
| **Copyright issues (highlights)** | Low         | Medium   | User-generated content defense, DMCA process, clear ToS                  |
| **Accessibility lawsuit**         | Low         | High     | WCAG 2.1 AA compliance from day 1, annual audits                         |
| **Privacy breach**                | Low         | Critical | Encryption, security audits, cyber insurance at scale                    |

### 18.4 Operational Risks

| Risk                         | Probability | Impact   | Mitigation Strategy                                      |
| ---------------------------- | ----------- | -------- | -------------------------------------------------------- |
| **Founder burnout**          | Medium      | Critical | Sustainable pace, delegate tasks, community support      |
| **Infrastructure outage**    | Low         | Medium   | Multi-region deployment, status page, incident playbook  |
| **Key dependency abandoned** | Low         | Medium   | Minimal dependencies, fork if needed, regular audits     |
| **Support overwhelm**        | Medium      | Medium   | Community forum, FAQ, automated responses, hire at scale |

### 18.5 Contingency Plans

**If Chrome Web Store Rejects**:

1. Appeal with detailed response
2. Meanwhile: Self-hosted .crx file
3. Firefox Add-ons as primary
4. Document everything for future attempts

**If Free Tiers Run Out**:

1. Optimize to stay within limits
2. Upgrade to paid tier only when revenue covers
3. Negotiate custom pricing with providers
4. Consider alternative providers

**If Competitor Launches Similar Product**:

1. Double down on unique features (modes, AI)
2. Build community faster
3. Focus on superior UX
4. Consider strategic partnerships

**If Critical Bug in Production**:

1. Immediate rollback to previous version
2. Fix and test thoroughly
3. Transparent communication to users
4. Post-mortem to prevent recurrence

---

## 19. Appendices

### Appendix A: Glossary

**Terms**:

- **Anchoring**: Process of storing highlight position
- **Fuzzy Matching**: Approximate text search algorithm
- **Multi-Selector**: Strategy using XPath, position, and quote
- **Orphan**: Highlight that cannot be restored
- **Shadow DOM**: Isolated DOM subtree for CSS encapsulation
- **XPath**: XML path language for DOM navigation

### Appendix B: Free Tools Reference

**Legal/Compliance**:

- Privacy Policy: https://termly.io/products/privacy-policy-generator/
- Terms of Service: https://www.freeprivacypolicy.com/
- Cookie Consent: https://www.getterms.io/ (or DIY)

**Security**:

- OWASP ZAP: https://www.zaproxy.org/
- npm audit: Built into npm
- Dependency-Check: https://owasp.org/www-project-dependency-check/

**Accessibility**:

- WAVE: https://wave.webaim.org/extension/
- axe DevTools: https://www.deque.com/axe/devtools/
- NVDA: https://www.nvaccess.org/
- Contrast Checker: https://webaim.org/resources/contrastchecker/

**Infrastructure (Free Tiers)**:

- Cloudflare Workers: 100k req/day
- Turso: 500 databases, 1GB storage
- Supabase: 500MB database, 50k MAU
- Resend: 3k emails/month
- Sentry: 5k errors/month
- Plausible CE: Self-hosted analytics

### Appendix C: Useful Resources

**Documentation**:

- Chrome Extension Docs: https://developer.chrome.com/docs/extensions/
- wxt.dev: https://wxt.dev/
- Dexie.js: https://dexie.org/
- Hono Framework: https://hono.dev/

**Learning**:

- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- GDPR Compliance: https://gdpr.eu/
- Hook Model: "Hooked" by Nir Eyal
- Fuzzy Matching: google-diff-match-patch docs

### Appendix D: Contact & Support

**Development Team**:

- Lead Developer: [Your Name]
- Email: dev@yourdomain.com
- GitHub: https://github.com/yourusername/extension

**Community**:

- Discord: [Invite Link]
- Twitter: @YourExtension
- Reddit: r/YourExtension

**Legal**:

- Privacy Policy: https://yourdomain.com/privacy
- Terms of Service: https://yourdomain.com/terms
- Contact: privacy@yourdomain.com

---

## Document Version History

| Version | Date       | Changes                             | Author       |
| ------- | ---------- | ----------------------------------- | ------------ |
| 1.0     | 2025-12-26 | Initial comprehensive specification | AI Assistant |

---

## Conclusion

This document represents a **complete, production-ready specification** for
building a browser extension that:

1. ✅ **Solves a real problem** (reading retention)
2. ✅ **Uses proven technology** (multi-selector, fuzzy matching)
3. ✅ **Addresses all critical gaps** (security, privacy, accessibility)
4. ✅ **Costs $0 to build** (free tiers only)
5. ✅ **Has clear monetization** (freemium with generous free tier)
6. ✅ **Includes psychology** (hook model, gamification)
7. ✅ **Plans for scale** (flexible architecture)

**You are now ready to begin implementation.**

**Next Steps**:

1. Review this document thoroughly
2. Set up GitHub repository
3. Complete Week 1 pre-development tasks
4. Start coding Sprint Mode (Week 2)
5. Launch in 10 weeks

**Good luck building! 🚀**
