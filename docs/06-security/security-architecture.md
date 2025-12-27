# Security Architecture
**Web Highlighter Extension - Security Design**

---

## Security Principles

1. **Zero Trust**: Trust no input, sanitize everything
2. **Least Privilege**: Minimum permissions required
3. **Defense in Depth**: Multiple security layers
4. **Privacy First**: Minimize data collection
5. **Open Source**: Publicly auditable code

---

## Content Security Policy (CSP)

### Manifest V3 CSP
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Protection Against**:
- ✅ XSS (Cross-Site Scripting)
- ✅ Code injection
- ✅ Unauthorized external scripts
- ✅ Unsafe inline scripts

---

## Input Sanitization

### DOMPurify Integration

**What We Sanitize**:
1. User-provided highlight text
2. User notes/annotations (Vault Mode)
3. Any HTML content from web pages
4. URLs and page titles

**Implementation**:
```typescript
import DOMPurify from 'dompurify';

export class SecurityService {
  static sanitizeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  static sanitizeText(text: string): string {
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
    });
  }

  static sanitizeURL(url: string): string | null {
    try {
      const parsed = new URL(url);
      // Only allow http/https
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

---

## Shadow DOM Isolation

**Why**: Prevents CSS conflicts and isolates our UI from host page

```typescript
class HighlightRenderer {
  private createShadowRoot(element: HTMLElement): ShadowRoot {
    const shadow = element.attachShadow({ mode: 'closed' });
    
    // Isolated styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;  /* Reset all styles */
      }
      .highlight {
        background-color: var(--highlight-color);
        /* ... */
      }
    `;
    shadow.appendChild(style);
    
    return shadow;
  }
}
```

**Protection**:
- ✅ CSS injection from host page
- ✅ Style conflicts
- ✅ JavaScript access to our DOM

---

## Permission Model

### Minimal Permissions

```json
{
  "permissions": [
    "activeTab",    // Only current tab
    "storage"       // Local settings only
  ]
}
```

**NOT Requested**:
- ❌ `<all_urls>` - Too broad
- ❌ `tabs` - Don't need all tab access
- ❌ `history` - Don't track browsing
- ❌ `cookies` - Don't need them
- ❌ `webRequest` - Don't intercept traffic

---

## Data Protection

### Sprint Mode (Current)
- **No Storage**: Everything in memory
- **No Network**: Zero external requests
- **No Tracking**: No analytics or telemetry

### Vault Mode (Future)
- **Encryption**: End-to-end encryption for sync
- **Local First**: Data stays local until user enables sync
- **User Control**: Export/delete data anytime

---

## Threat Mitigation

### 1. XSS (Cross-Site Scripting)
**Attack**: Malicious script injected via highlighted text

**Mitigation**:
- ✅ DOMPurify sanitization
- ✅ Content Security Policy
- ✅ Shadow DOM isolation
- ✅ No `innerHTML` usage

### 2. Code Injection
**Attack**: Malicious code in extension updates

**Mitigation**:
- ✅ Chrome Web Store review process
- ✅ Open source (public audit)
- ✅ Signed releases
- ✅ Subresource Integrity (SRI)

### 3. Data Exfiltration
**Attack**: Stealing user highlights/browsing data

**Mitigation**:
- ✅ No analytics/tracking
- ✅ No external network requests (Sprint Mode)
- ✅ Minimal permissions
- ✅ Open source audit

### 4. CSS Injection
**Attack**: Malicious styles affecting extension UI

**Mitigation**:
- ✅ Shadow DOM (closed mode)
- ✅ Style reset in shadow root
- ✅ No external stylesheets

### 5. Clickjacking
**Attack**: Tricking users into clicking malicious elements

**Mitigation**:
- ✅ No iframes allowed
- ✅ CSP frame-ancestors directive
- ✅ User-initiated actions only

---

## Secure Coding Practices

### 1. Type Safety
```typescript
// ✅ Good: Explicit types prevent injection
function createHighlight(text: string, color: HexColor): Highlight {
  const sanitized = SecurityService.sanitizeText(text);
  return new Highlight(sanitized, color);
}

// ❌ Bad: Any type allows anything
function createHighlight(text: any, color: any) {
  return { text, color };
}
```

### 2. Input Validation
```typescript
// ✅ Good: Validate before use
function setColor(color: string): void {
  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    throw new ValidationError('Invalid color format');
  }
  this.color = color;
}

// ❌ Bad: Trust user input
function setColor(color: string): void {
  this.color = color;  // Could be malicious
}
```

### 3. Safe DOM Manipulation
```typescript
// ✅ Good: Use textContent, not innerHTML
element.textContent = userProvidedText;

// ❌ Bad: innerHTML allows script injection
element.innerHTML = userProvidedText;
```

---

## Security Testing

### Automated Tests
```typescript
describe('SecurityService', () => {
  it('should sanitize XSS attempts', () => {
    const malicious = '<script>alert("xss")</script>';
    const safe = SecurityService.sanitizeHTML(malicious);
    expect(safe).not.toContain('<script>');
  });

  it('should reject javascript: URLs', () => {
    const malicious = 'javascript:alert(1)';
    const safe = SecurityService.sanitizeURL(malicious);
    expect(safe).toBeNull();
  });
});
```

### Manual Security Review Checklist
- [ ] All user inputs sanitized
- [ ] No `innerHTML` usage
- [ ] No `eval()` or `Function()` calls
- [ ] URLs validated before use
- [ ] CSP headers configured
- [ ] Permissions minimized
- [ ] Dependencies audited

---

## Dependency Security

### NPM Audit
```bash
# Run before every release
npm audit

# Fix vulnerabilities
npm audit fix
```

### Dependency Review
- ✅ Only use well-maintained packages
- ✅ Review security advisories
- ✅ Pin versions in package.json
- ✅ Automated Dependabot alerts

---

## Incident Response

### If Vulnerability Discovered

1. **Assess Severity**: CVSS score, impact analysis
2. **Patch Immediately**: Create fix in private branch
3. **Notify Users**: Update in extension store
4. **Disclosure**: Coordinated 90-day disclosure
5. **Post-Mortem**: Document and prevent recurrence

### Security Contact
- **GitHub Issues**: [Security label]
- **Email**: security@example.com
- **PGP**: [Key fingerprint]

---

## Compliance

### Chrome Web Store Policies
- ✅ Minimal permissions
- ✅ Privacy policy published
- ✅ Data collection disclosed
- ✅ No obfuscated code

### GDPR (Future - Vault Mode)
- ✅ Data portability
- ✅ Right to deletion
- ✅ Consent for processing
- ✅ Data breach notification

---

## Security Roadmap

### Sprint Mode (Current)
- ✅ DOMPurify integration
- ✅ Shadow DOM isolation
- ✅ CSP configuration
- ✅ Input validation
- ✅ Minimal permissions

### Vault Mode (Future)
- ⏳ End-to-end encryption
- ⏳ Secure key management
- ⏳ Encrypted sync protocol
- ⏳ Security audit

### Gen Mode (Future)
- ⏳ API key protection
- ⏳ Data minimization for AI
- ⏳ Consent management

---

**Last Updated**: 2025-12-27  
**Security Lead**: System Architect  
**Next Review**: Before Sprint 1 release
