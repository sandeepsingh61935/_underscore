# Sprint Mode - Complete Implementation Plan

**Product**: Web Highlighter Extension - Sprint Mode ONLY  
**Timeline**: 10 weeks (5 × 2-week sprints)  
**Focus**: Architecture, Security, Privacy, Zero Technical Debt  
**Deliverable**: Fully working Sprint Mode (ephemeral highlighting) from A to Z

---

## Architectural Decisions (User Approved)

### Decision 1: Event Sourcing for Future Sync ✅

**When**: Vault Mode (post Sprint Mode)  
**Why**: Event-driven architecture suits this project perfectly  
**Benefits**:
- Zero data loss in sync conflicts
- Complete audit trail of all changes
- Time-travel debugging capabilities
- Natural fit for distributed systems

**Implementation**: Will be added in Vault Mode sprints (Week 11+)

### Decision 2: Database Strategy ✅

**Development Phase** (Sprint Mode → Early Vault Mode):
```yaml
Database: Supabase (PostgreSQL)
Reason: 
  - Fast setup (5 minutes)
  - Built-in auth, storage, realtime
  - Excellent DX (dashboard, logs)
  - Free tier: 500MB (sufficient for testing)
Use for: Development, testing, first 1,000 users
```

**Production Phase** (After market validation):
```yaml
Database: Oracle Cloud Always Free
Reason:
  - FOREVER FREE (zero cost)
  - 20GB PostgreSQL database
  - 1GB RAM, AMD compute
  - Handles 50,000 users easily
Migration: 
  - Week 14-15 (after Sprint Mode launch)
  - PostgreSQL dump from Supabase → Oracle Cloud
  - Zero downtime migration (DNS cutover)
```

### Decision 3: Sprint Mode Foundation

**Current Focus**: Sprint Mode (in-memory only, NO database)  
**Foundation Work**: Prepare architecture for Event Sourcing during Sprint 0  
**Database Work**: Set up Supabase in parallel (for future Vault Mode)

---

## Executive Summary

This plan delivers **production-ready Sprint Mode** with:

✅ **Zero dependencies** (no backend, no database, no sync)  
✅ **Rock-solid architecture** (proper state management, error handling)  
✅ **Security first** (CSP, XSS protection, sandboxing)  
✅ **Privacy guaranteed** (zero storage, zero tracking)  
✅ **Performance optimized** (<50ms highlight render)  
✅ **Accessibility compliant** (WCAG 2.1 AA)  
✅ **Cross-browser** (Chrome, Firefox, Edge)  

**After Sprint Mode ships, then consider Vault/Gen modes.**

---

## Sprint Mode Requirements (Complete)

### Functional Requirements

```yaml
Highlighting:
  - FR-1: User can select text and highlight with double-tap
  - FR-2: User can highlight with keyboard shortcut (Ctrl+U)
  - FR-3: Highlight renders with auto-contrast color (WCAG AAA)
  - FR-4: User can click highlight to remove
  - FR-5: User can clear all highlights (Ctrl+Shift+U)
  - FR-6: Highlight count badge shows active highlights

Visual Design:
  - FR-7: Smooth fade-in animation (200ms)
  - FR-8: Hover glow effect on highlights
  - FR-9: Customizable highlight color (5 presets)
  - FR-10: Color picker for custom colors

Mode Management:
  - FR-11: Mode indicator shows "SPRINT MODE"
  - FR-12: Keyboard shortcut to toggle mode (Ctrl+Shift+M)
  - FR-13: Settings panel to configure defaults
  - FR-14: Popup UI shows feature explanations

Persistence:
  - FR-15: Highlights stored in memory only (JS Map)
  - FR-16: Highlights cleared on page navigation
  - FR-17: Highlights cleared on tab close
  - FR-18: No data persisted to disk ever

Website Compatibility:
  - FR-19: Works on 95% of websites
  - FR-20: Handles Shadow DOM correctly
  - FR-21: Handles iframes (if same-origin)
  - FR-22: Graceful degradation on incompatible sites
```

### Non-Functional Requirements

```yaml
Performance:
  - NFR-1: Highlight render < 50ms (p95)
  - NFR-2: Extension bundle < 30KB gzipped
  - NFR-3: Memory usage < 5MB per tab
  - NFR-4: No visual jank or flicker

Security:
  - NFR-5: Content Security Policy configured
  - NFR-6: XSS protection (DOMPurify)
  - NFR-7: Minimal permissions (activeTab only)
  - NFR-8: No eval() or Function() constructor

Privacy:
  - NFR-9: Zero network requests
  - NFR-10: No analytics or tracking
  - NFR-11: No data collection
  - NFR-12: Privacy policy compliant

Accessibility:
  - NFR-13: Keyboard navigation (100% keyboard accessible)
  - NFR-14: Screen reader support (ARIA labels)
  - NFR-15: Color contrast 7:1 (auto-calculated)
  - NFR-16: Focus indicators visible

Quality:
  - NFR-17: 80% code coverage (unit tests)
  - NFR-18: Zero lint errors
  - NFR-19: TypeScript strict mode
  - NFR-20: E2E tests for critical paths
```

---

## Technical Architecture (Sprint Mode Only)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              BROWSER EXTENSION                      │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │        CONTENT SCRIPT (Per Tab)            │   │
│  │                                            │   │
│  │  ┌──────────────┐    ┌──────────────┐    │   │
│  │  │  Selection   │    │   Highlight  │    │   │
│  │  │  Detector    │───▶│   Renderer   │    │   │
│  │  │              │    │ (Shadow DOM) │    │   │
│  │  └──────────────┘    └──────────────┘    │   │
│  │         │                    │            │   │
│  │         ▼                    ▼            │   │
│  │  ┌──────────────────────────────────┐    │   │
│  │  │   In-Memory Highlight Store      │    │   │
│  │  │   (Map<string, Highlight>)       │    │   │
│  │  │   - Zero persistence             │    │   │
│  │  │   - Auto-cleanup on unload       │    │   │
│  │  └──────────────────────────────────┘    │   │
│  │                                            │   │
│  │  ┌──────────────┐    ┌──────────────┐    │   │
│  │  │  Keyboard    │    │   Color      │    │   │
│  │  │  Shortcuts   │    │   Manager    │    │   │
│  │  └──────────────┘    └──────────────┘    │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │         POPUP UI (Extension Icon)          │   │
│  │                                            │   │
│  │  - Sprint Mode indicator                  │   │
│  │  - Highlight count                        │   │
│  │  - Color picker                           │   │
│  │  - Settings link                          │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │         SETTINGS PAGE (chrome://extensions)│   │
│  │                                            │   │
│  │  - Default color                          │   │
│  │  - Keyboard shortcuts customization       │   │
│  │  - Animation preferences                  │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

NO BACKEND • NO DATABASE • NO SYNC • NO API
```

### Technology Stack (Minimal)

```yaml
Core:
  - TypeScript 5.x (strict mode)
  - Web Components (Lit 3.x)
  - Vite 5.x (bundler)
  - wxt.dev 0.17.x (extension framework)

UI:
  - Custom Shadow DOM components
  - Vanilla CSS (no Tailwind for Sprint Mode)
  - CSS custom properties for theming

Security:
  - DOMPurify 3.x (XSS sanitization)
  - Content Security Policy (manifest)

Testing:
  - Vitest 1.x (unit tests)
  - Playwright 1.x (E2E tests)
  - @testing-library/dom (component tests)

Development:
  - ESLint + Prettier
  - TypeScript strict mode
  - GitHub Actions (CI/CD)

Total Bundle Size Target: <30KB gzipped
```

### Code Structure

```
sprint-mode-extension/
├── manifest.json                 # Extension manifest (v3)
├── src/
│   ├── content/
│   │   ├── main.ts              # Entry point for content script
│   │   ├── selection-detector.ts # Double-tap & keyboard selection
│   │   ├── highlight-renderer.ts # Shadow DOM rendering
│   │   ├── highlight-store.ts    # In-memory Map storage
│   │   ├── color-manager.ts      # Auto-contrast calculation
│   │   └── keyboard-handler.ts   # Keyboard shortcuts
│   ├── popup/
│   │   ├── popup.ts             # Popup UI logic
│   │   └── popup.html           # Popup template
│   ├── settings/
│   │   ├── settings.ts          # Settings page logic
│   │   └── settings.html        # Settings template
│   ├── components/
│   │   ├── highlight-element.ts # Custom element (Shadow DOM)
│   │   ├── color-picker.ts      # Color picker component
│   │   └── mode-indicator.ts    # Mode badge component
│   ├── styles/
│   │   ├── highlight.css        # Highlight styles
│   │   ├── popup.css            # Popup styles
│   │   └── common.css           # Shared styles
│   └── utils/
│       ├── dom-utils.ts         # DOM helpers
│       ├── color-utils.ts       # Color contrast calcs
│       └── logger.ts            # Console logger
├── tests/
│   ├── unit/
│   │   ├── color-manager.test.ts
│   │   ├── highlight-store.test.ts
│   │   └── selection-detector.test.ts
│   └── e2e/
│       ├── basic-highlighting.spec.ts
│       ├── keyboard-shortcuts.spec.ts
│       └── cross-site-compatibility.spec.ts
├── public/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── privacy-policy.html
├── vite.config.ts
├── wxt.config.ts
├── tsconfig.json
└── package.json
```

---

## Sprint Breakdown (5 Sprints × 2 Weeks)

### Sprint 0: Setup & Foundation (Week 1-2)

**Goal**: Infrastructure ready, dev environment working

#### Tasks

```yaml
Infrastructure:
  - [ ] Create GitHub repository
  - [ ] Set up wxt.dev project
  - [ ] Configure TypeScript (strict mode)
  - [ ] Set up Vite bundler
  - [ ] Configure ESLint + Prettier
  - [ ] Set up Vitest (unit tests)
  - [ ] Set up Playwright (E2E tests)
  - [ ] Configure GitHub Actions (CI/CD)

Future Architecture Prep (for Vault Mode):
  - [ ] Create Supabase account and project
  - [ ] Design Event Sourcing schema (events table)
  - [ ] Document migration path to Oracle Cloud
  - [ ] Create database migration scripts (ready for Vault Mode)
  - [ ] Test Supabase connection (hello world)

Security:
  - [ ] Configure CSP in manifest.json
  - [ ] Set up DOMPurify
  - [ ] Document security architecture
  - [ ] Create threat model document

Documentation:
  - [ ] README with setup instructions
  - [ ] CONTRIBUTING.md
  - [ ] Privacy policy draft
  - [ ] Architecture decision records (ADRs)

Design:
  - [ ] Design highlight visual style
  - [ ] Design popup UI mockup
  - [ ] Design settings page
  - [ ] Pick color palette (5 presets)
```

#### Acceptance Criteria

- [ ] `npm run dev` starts extension in dev mode
- [ ] `npm test` runs all unit tests
- [ ] `npm run test:e2e` runs E2E tests
- [ ] Extension loads in Chrome DevTools
- [ ] No console errors on extension load

#### Deliverables

- Working dev environment
- CI/CD pipeline
- Security foundation
- Design specs

---

### Sprint 1: Core Highlighting (Week 3-4)

**Goal**: Basic highlighting works on static pages

#### Tasks

```yaml
Selection Detection:
  - [ ] Implement double-tap selection detection
  - [ ] Implement keyboard shortcut (Ctrl+U)
  - [ ] Debounce selection events (100ms)
  - [ ] Filter out empty selections
  - [ ] Handle collapsed selections (cursor only)

Highlight Rendering (Shadow DOM):
  - [ ] Create HighlightElement web component
  - [ ] Implement Shadow DOM isolation
  - [ ] Add fade-in animation (200ms)
  - [ ] Add hover glow effect
  - [ ] Handle text wrapping across lines

Highlight Storage (In-Memory):
  - [ ] Create HighlightStore class (Map)
  - [ ] Add highlight (generate UUID)
  - [ ] Remove highlight (by ID)
  - [ ] Clear all highlights
  - [ ] Get highlight count

Color Management:
  - [ ] Implement auto-contrast algorithm (WCAG AAA 7:1)
  - [ ] Calculate luminance for any background
  - [ ] Pick black or white text automatically
  - [ ] Support 5 preset colors

Cleanup:
  - [ ] Clear highlights on navigation
  - [ ] Clear highlights on tab close
  - [ ] Prevent memory leaks
```

#### Acceptance Criteria

```yaml
Functional:
  - [ ] User can double-tap text to highlight
  - [ ] User can press Ctrl+U to highlight selection
  - [ ] Highlight appears in <50ms
  - [ ] Highlight has correct color contrast (7:1)
  - [ ] Clicking highlight removes it
  - [ ] Highlights cleared on page navigation

Technical:
  - [ ] Code coverage > 70%
  - [ ] No memory leaks (tested with Chrome DevTools)
  - [ ] Works on Wikipedia, Medium, NYTimes

Testing:
  - [ ] 10+ unit tests (color-manager, highlight-store)
  - [ ] 3 E2E tests (highlight-create, highlight-remove, navigation-cleanup)
```

#### Deliverables

- Working highlighting on static pages
- In-memory storage functional
- Auto-contrast working
- Tests passing

---

### Sprint 2: Advanced Features (Week 5-6)

**Goal**: Full feature set complete

#### Tasks

```yaml
Keyboard Shortcuts:
  - [ ] Ctrl+U: Highlight selection
  - [ ] Ctrl+Shift+U: Clear all highlights
  - [ ] Ctrl+Shift+M: Toggle mode indicator
  - [ ] Escape: Deselect current selection
  - [ ] Custom shortcut configuration

Visual Enhancements:
  - [ ] Highlight count badge (top-right corner)
  - [ ] Mode indicator animation
  - [ ] Color picker in popup
  - [ ] Smooth transitions (all 200ms)

Popup UI:
  - [ ] Show current mode ("SPRINT MODE")
  - [ ] Show highlight count
  - [ ] Color picker (5 presets + custom)
  - [ ] Quick settings link
  - [ ] Help/tutorial link

Settings Page:
  - [ ] Default color selection
  - [ ] Keyboard shortcut customization
  - [ ] Animation toggle (enable/disable)
  - [ ] Reset to defaults button

Website Compatibility:
  - [ ] Handle Shadow DOM content
  - [ ] Handle iframes (same-origin)
  - [ ] Handle contenteditable elements
  - [ ] Detect incompatible sites (canvas, PDF viewer)
  - [ ] Show warning for incompatible sites
```

#### Acceptance Criteria

```yaml
Functional:
  - [ ] All keyboard shortcuts work
  - [ ] Highlight count updates in real-time
  - [ ] Color picker changes highlight color instantly
  - [ ] Settings persist across sessions (chrome.storage.sync)
  - [ ] Works on 95% of top 100 websites

UX:
  - [ ] Popup loads in <100ms
  - [ ] Settings page is intuitive
  - [ ] Animations are smooth (60fps)
  - [ ] No flicker or visual glitches

Testing:
  - [ ] 20+ unit tests (keyboard-handler, color-picker)
  - [ ] 5 E2E tests (shortcuts, popup, settings, cross-site)
  - [ ] Manual testing on 20+ websites
```

#### Deliverables

- Full feature set implemented
- Popup & settings UI complete
- Cross-site compatibility tested

---

### Sprint 3: Performance & Optimization (Week 7-8)

**Goal**: <30KB bundle, <50ms render, zero jank

#### Tasks

```yaml
Performance Optimization:
  - [ ] Code splitting (content script, popup, settings)
  - [ ] Tree-shaking unused code
  - [ ] Minify bundle with Terser
  - [ ] Lazy-load non-critical components
  - [ ] Remove console.logs in production
  - [ ] Optimize Shadow DOM rendering
  - [ ] Use requestAnimationFrame for animations

Bundle Size:
  - [ ] Analyze bundle with Vite rollup-plugin-visualizer
  - [ ] Replace Lit with vanilla Custom Elements
  - [ ] Inline critical CSS
  - [ ] Use CSS custom properties (not Sass)
  - [ ] Remove unused dependencies
  - [ ] Target: <30KB gzipped

Memory Management:
  - [ ] Use WeakMap for DOM references
  - [ ] Clear event listeners on cleanup
  - [ ] Profile memory with Chrome DevTools
  - [ ] Fix any memory leaks
  - [ ] Target: <5MB per tab

Rendering Performance:
  - [ ] Batch DOM updates
  - [ ] Use DocumentFragment for multiple highlights
  - [ ] Throttle scroll/resize events
  - [ ] Cancel animations if tab is hidden
  - [ ] Target: 60fps, <50ms render
```

#### Acceptance Criteria

```yaml
Performance:
  - [ ] Bundle size < 30KB gzipped
  - [ ] Highlight render < 50ms (p95)
  - [ ] Memory usage < 5MB per tab
  - [ ] Lighthouse performance score > 95

Quality:
  - [ ] No memory leaks (tested for 1 hour)
  - [ ] No performance regressions (benchmark suite)
  - [ ] Smooth animations (60fps)

Testing:
  - [ ] Performance benchmark suite
  - [ ] Memory leak tests
  - [ ] Bundle size CI check (fails if >30KB)
```

#### Deliverables

- Optimized bundle (<30KB)
- Fast rendering (<50ms)
- Zero performance issues

---

### Sprint 4: Security & Accessibility (Week 9)

**Goal**: WCAG AA compliant, secure, audited

#### Tasks

```yaml
Security Hardening:
  - [ ] Audit Content Security Policy
  - [ ] Test XSS attack vectors
  - [ ] Use DOMPurify for all user input
  - [ ] Validate manifest permissions
  - [ ] Run OWASP ZAP scan
  - [ ] Fix all security issues

Accessibility:
  - [ ] Keyboard navigation (tab through all elements)
  - [ ] ARIA labels for all interactive elements
  - [ ] Screen reader testing (NVDA)
  - [ ] Focus indicators (3px outline)
  - [ ] Color contrast verification (auto + presets)
  - [ ] Heading hierarchy (popup, settings)
  - [ ] Run WAVE accessibility audit
  - [ ] Run axe DevTools audit

Privacy:
  - [ ] Verify zero network requests
  - [ ] Verify zero local storage
  - [ ] Verify zero tracking
  - [ ] Write privacy policy
  - [ ] Add privacy policy link to manifest

Documentation:
  - [ ] User guide (how to use Sprint Mode)
  - [ ] Keyboard shortcuts reference
  - [ ] Troubleshooting FAQ
  - [ ] Known limitations doc
```

#### Acceptance Criteria

```yaml
Security:
  - [ ] OWASP ZAP: Zero critical/high issues
  - [ ] npm audit: Zero vulnerabilities
  - [ ] CSP: No eval(), no inline scripts
  - [ ] Minimal permissions (activeTab only)

Accessibility:
  - [ ] WAVE: Zero errors
  - [ ] axe DevTools: Zero violations
  - [ ] Keyboard-only navigation works 100%
  - [ ] NVDA reads all UI correctly
  - [ ] Color contrast > 7:1 (all combinations)

Privacy:
  - [ ] Zero network requests (verified with DevTools)
  - [ ] Zero storage used (chrome.storage reports 0 bytes)
  - [ ] Privacy policy reviewed
```

#### Deliverables

- Security audit passed
- WCAG 2.1 AA compliant
- Privacy policy finalized

---

### Sprint 5: Quality Assurance & Launch Prep (Week 10)

**Goal**: Production-ready, tested on 50+ sites, published

#### Tasks

```yaml
Cross-Browser Testing:
  - [ ] Chrome stable (test newest)
  - [ ] Firefox stable
  - [ ] Edge stable
  - [ ] Test on Windows, Mac, Linux

Cross-Site Testing:
  - [ ] Test on top 50 websites (Alexa ranking)
  - [ ] Test on known problematic sites (Twitter, Reddit, Gmail)
  - [ ] Test on sites with Shadow DOM (YouTube, GitHub)
  - [ ] Test on sites with iframes (news sites)
  - [ ] Document incompatible sites

Bug Bash:
  - [ ] Internal testing (8 hours)
  - [ ] Friends/family testing (10 people)
  - [ ] Fix all critical bugs
  - [ ] Fix high-priority bugs
  - [ ] Document known issues

Polish:
  - [ ] Final UI tweaks
  - [ ] Icon polish (16px, 48px, 128px)
  - [ ] Animation smoothness check
  - [ ] Copy editing (all text)

Store Submission:
  - [ ] Chrome Web Store listing
    - [ ] Screenshots (5 minimum)
    - [ ] Promo video (30 seconds)
    - [ ] Description (compelling copy)
    - [ ] Privacy policy link
    - [ ] Support email
  - [ ] Firefox Add-ons submission
  - [ ] Edge Add-ons submission

Launch Preparation:
  - [ ] Landing page (simple, 1 page)
  - [ ] Product Hunt teaser post
  - [ ] Hacker News draft
  - [ ] Reddit posts draft
  - [ ] Twitter thread draft
  - [ ] Email to beta list
```

#### Acceptance Criteria

```yaml
Quality:
  - [ ] Zero critical bugs
  - [ ] < 5 known minor bugs
  - [ ] Works on 95% of top 50 websites
  - [ ] 4.5+ star rating (internal testers)

Testing:
  - [ ] 80%+ code coverage
  - [ ] All E2E tests passing
  - [ ] Tested on 3 browsers × 3 OSes
  - [ ] 10+ beta testers approved

Store Submission:
  - [ ] Chrome Web Store: Submitted
  - [ ] Firefox Add-ons: Submitted  
  - [ ] Edge Add-ons: Submitted
  - [ ] All stores approved within 5 days
```

#### Deliverables

- Extension published to stores
- Landing page live
- Launch materials ready
- Beta testers satisfied

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// Example: color-manager.test.ts
import { describe, it, expect } from 'vitest';
import { ColorManager } from '../src/content/color-manager';

describe('ColorManager', () => {
  it('should calculate correct contrast for white background', () => {
    const manager = new ColorManager();
    const color = manager.getContrastColor('#FFFFFF', 7.0);
    expect(color).toBe('#000000'); // Black text on white
  });
  
  it('should calculate correct contrast for dark background', () => {
    const manager = new ColorManager();
    const color = manager.getContrastColor('#222222', 7.0);
    expect(color).toBe('#FFFFFF'); // White text on dark
  });
  
  it('should meet WCAG AAA contrast ratio', () => {
    const manager = new ColorManager();
    const contrastRatio = manager.calculateContrast('#FFEB3B', '#000000');
    expect(contrastRatio).toBeGreaterThan(7.0);
  });
});

// Run: npm test
```

### E2E Tests (Playwright)

```typescript
// Example: basic-highlighting.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Sprint Mode Highlighting', () => {
  test.beforeEach(async ({ page, context }) => {
    // Load extension
    const extensionPath = path.join(__dirname, '../../dist');
    await context.addInitScript({ path: extensionPath });
    
    // Navigate to test page
    await page.goto('https://example.com');
  });
  
  test('should highlight text on double-tap', async ({ page }) => {
    // Select text
    await page.locator('p').first().dblclick();
    
    // Verify highlight rendered
    const highlight = page.locator('app-highlight');
    await expect(highlight).toBeVisible();
    await expect(highlight).toHaveCSS('background-color', 'rgb(255, 235, 59)');
  });
  
  test('should remove highlight on click', async ({ page }) => {
    // Create highlight
    await page.locator('p').first().dblclick();
    
    // Click highlight
    const highlight = page.locator('app-highlight');
    await highlight.click();
    
    // Verify removed
    await expect(highlight).not.toBeVisible();
  });
  
  test('should clear all highlights with Ctrl+Shift+U', async ({ page }) => {
    // Create multiple highlights
    await page.locator('p').nth(0).dblclick();
    await page.locator('p').nth(1).dblclick();
    
    // Clear all
    await page.keyboard.press('Control+Shift+U');
    
    // Verify all removed
    const highlights = page.locator('app-highlight');
    await expect(highlights).toHaveCount(0);
  });
});

// Run: npm run test:e2e
```

### Manual Testing Checklist

```yaml
Websites to Test:
  News:
    - [ ] New York Times (https://nytimes.com)
    - [ ] The Guardian (https://theguardian.com)
    - [ ] BBC (https://bbc.com)
  
  Social:
    - [ ] Twitter/X (https://twitter.com)
    - [ ] Reddit (https://reddit.com)
    - [ ] Hacker News (https://news.ycombinator.com)
  
  Technical:
    - [ ] GitHub (https://github.com)
    - [ ] Stack Overflow (https://stackoverflow.com)
    - [ ] Medium (https://medium.com)
  
  General:
    - [ ] Wikipedia (https://wikipedia.org)
    - [ ] Google Docs (https://docs.google.com)
    - [ ] Gmail (https://mail.google.com)

Test Cases:
  Basic:
    - [ ] Double-tap highlights text
    - [ ] Keyboard shortcut highlights text
    - [ ] Click removes highlight
    - [ ] Clear all removes all highlights
  
  Edge Cases:
    - [ ] Highlighting across paragraphs
    - [ ] Highlighting in tables
    - [ ] Highlighting in lists
    - [ ] Highlighting with special characters
    - [ ] Highlighting on dark mode sites
  
  Performance:
    - [ ] 100 highlights on one page (performance)
    - [ ] Rapidly create/remove highlights (no jank)
    - [ ] Scroll while highlighting (smooth)
```

---

## Verification Plan

### Automated Verification

```yaml
Every Commit (GitHub Actions):
  - Run unit tests (npm test)
  - Run linter (npm run lint)
  - Type check (tsc --noEmit)
  - Bundle size check (<30KB)

Every PR:
  - Run E2E tests (npm run test:e2e)
  - Security audit (npm audit)
  - Code coverage > 80%
  - Performance benchmarks (no regression)

Before Release:
  - Accessibility audit (WAVE, axe)
  - Security scan (OWASP ZAP)
  - Manual testing (50+ websites)
  - Beta tester approval
```

### User Acceptance Testing

```yaml
Beta Program (Week 13):
  Participants: 20-30 early adopters
  
  Testing Tasks:
    1. Install extension
    2. Highlight 20 passages across 5 websites
    3. Try all keyboard shortcuts
    4. Customize colors
    5. Report any issues
  
  Success Criteria:
    - 90%+ completion rate
    - 4+ star rating (average)
    - <10 bugs reported
    - Zero critical bugs

  Feedback Collection:
    - Post-test survey (Google Forms)
    - Bug reporting (GitHub Issues)
    - Feature requests (GitHub Discussions)
```

---

## Definition of Done

Sprint Mode is **DONE** when:

✅ **Functional**: All 22 functional requirements met  
✅ **Performance**: <30KB bundle, <50ms render, <5MB memory  
✅ **Security**: OWASP ZAP clean, npm audit clean, CSP configured  
✅ **Privacy**: Zero network requests, zero storage, privacy policy  
✅ **Accessibility**: WCAG 2.1 AA, WAVE clean, axe clean, keyboard nav  
✅ **Quality**: 80%+ coverage, all tests passing, <5 known bugs  
✅ **Cross-browser**: Works on Chrome, Firefox, Edge  
✅ **Cross-site**: Works on 95% of top 50 websites  
✅ **Published**: Live on Chrome Web Store, Firefox Add-ons, Edge Add-ons  
✅ **Documented**: User guide, privacy policy, support docs  

**When Sprint Mode is DONE, celebrate 🎉 then plan Vault Mode.**

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shadow DOM breaks on some sites | High | Medium | Fallback to regular DOM with warning |
| Chrome Web Store rejection | Medium | High | Study guidelines, over-communicate, prepare appeal |
| Performance issues at scale | Medium | Medium | Performance benchmarks in CI, load testing |
| Browser API changes | Low | High | Subscribe to Chrome/Firefox dev channels |
| Accessibility issues | Medium | Medium | Audit early and often, hire consultant if needed |

---

## Success Metrics (Post-Launch)

```yaml
Week 1:
  - Installs: 500
  - Active users: 200
  - Crash rate: <1%
  - Chrome Web Store rating: 4.0+

Month 1:
  - Installs: 2,000
  - Active users: 1,000
  - Retention (7-day): >50%
  - Rating: 4.3+

Quarter 1:
  - Installs: 10,000
  - Active users: 5,000
  - Retention (30-day): >30%
  - Rating: 4.5+
  - Zero security incidents
  - Zero privacy violations
```

---

## Post-Sprint Mode: What's Next?

After Sprint Mode ships and stabilizes (Month 3-4), evaluate:

**Option 1: Add Vault Mode** (persistent local storage)
- Requires: IndexedDB, multi-selector strategy, restoration logic
- Timeline: +6 weeks
- Complexity: High

**Option 2: Add Cloud Sync** (requires backend)
- Requires: Auth, API, database, Event Sourcing
- Timeline: +8 weeks
- Complexity: Very High

**Option 3: Add Gen Mode** (AI features)
- Requires: Backend, AI API, cost management
- Timeline: +6 weeks
- Complexity: High

**Recommendation**: Validate Sprint Mode first (get 1,000 users), then decide based on user feedback.

---

## Summary

This plan delivers **production-ready Sprint Mode in 10 weeks** with:

- ✅ Clean architecture (zero technical debt)
- ✅ Security-first approach
- ✅ Privacy guaranteed
- ✅ Accessibility compliant
- ✅ Performance optimized
- ✅ Thoroughly tested

**Focus**: Get Sprint Mode perfect before adding complexity.

**Philosophy**: Ship small, ship fast, ship quality. Then iterate based on real user data.

**Next Step**: Review this plan, approve, then start Sprint 0.
