# Threat Model
**Web Highlighter Extension - Security Analysis**

---

## Assets

### What We're Protecting

1. **User Highlights** (Vault Mode future)
   - Highlighted text snippets
   - Page URLs
   - Personal notes/annotations
   - Timestamps

2. **User Privacy**
   - Browsing activity
   - Reading habits
   - Personal interests

3. **Extension Integrity**
   - Code authenticity
   - User trust
   - Reputation

---

## Threat Actors

### 1. Malicious Websites
**Capability**: Control web page content  
**Motivation**: Steal data, inject code, phishing  
**Access**: Content script execution context

### 2. Malicious Extensions
**Capability**: Access to browser APIs  
**Motivation**: Steal highlights, spy on activity  
**Access**: Shared storage (if permissions overlap)

### 3. Network Attackers (Future - Vault Mode)
**Capability**: Intercept network traffic  
**Motivation**: Steal synced highlights  
**Access**: Network layer

### 4. Compromised Dependencies
**Capability**: Run code in extension  
**Motivation**: Supply chain attack  
**Access**: Full extension context

---

## Threat Scenarios

### HIGH RISK

#### T1: XSS via Highlighted Text
**Scenario**: Attacker includes `<script>` tag in page text, user highlights it

**Attack Flow**:
1. Malicious website includes: `Hello <script>alert('xss')</script> World`
2. User highlights the text
3. Extension stores/renders text
4. Script executes in extension context

**Impact**: 
- Code execution in extension
- Access to extension APIs
- Potential data theft

**Mitigation**:
- ✅ DOMPurify sanitization
- ✅ textContent instead of innerHTML
- ✅ CSP blocks inline scripts
- ✅ Shadow DOM isolation

**Current Status**: MITIGATED ✅

---

#### T2: CSS Injection
**Scenario**: Malicious page CSS affects extension UI

**Attack Flow**:
1. Malicious page includes global CSS rules
2. CSS affects extension overlay
3. UI spoofing or clickjacking

**Impact**:
- UI manipulation
- Phishing attacks
- Clickjacking

**Mitigation**:
- ✅ Shadow DOM (closed mode)
- ✅ `all: initial` CSS reset
- ✅ No external stylesheets

**Current Status**: MITIGATED ✅

---

#### T3: Data Exfiltration (Vault Mode)
**Scenario**: Malicious code steals synced highlights

**Attack Flow**:
1. Extension compromised (malicious dependency)
2. Code accesses IndexedDB/storage
3. Sends data to attacker server

**Impact**:
- User privacy breach
- Sensitive information leaked

**Mitigation**:
- ⏳ Dependency auditing
- ⏳ Minimal dependencies
- ⏳ Code signing
- ⏳ Regular security audits

**Current Status**: Sprint Mode has NO data to exfiltrate ✅

---

### MEDIUM RISK

#### T4: Dependency Vulnerability
**Scenario**: NPM package has security flaw

**Attack Flow**:
1. Attacker compromises npm package
2. Malicious code in dependency
3. Extension update includes vulnerability

**Impact**:
- Code execution
- Data theft
- User compromise

**Mitigation**:
- ✅ `npm audit` in CI/CD
- ✅ Dependabot alerts
- ✅ Pin dependency versions
- ✅ Minimal dependencies

**Current Status**: PARTIALLY MITIGATED ⚠️

---

#### T5: Phishing via Highlight Notes (Future)
**Scenario**: Attacker tricks user into clicking malicious link in notes

**Attack Flow**:
1. User copies malicious URL into notes
2. Extension renders URL as clickable
3. User clicks, visits phishing site

**Impact**:
- Phishing attack
- Credential theft

**Mitigation**:
- ⏳ URL validation
- ⏳ Warning for external links
- ⏳ Link preview

**Current Status**: NOT APPLICABLE (Sprint Mode) ⏳

---

### LOW RISK

#### T6: Storage Quota Exhaustion
**Scenario**: Attacker fills storage to DoS extension

**Attack Flow**:
1. Attacker tricks user into highlighting massive amounts
2. Storage quota exhausted
3. Extension stops working

**Impact**:
- Denial of service
- User annoyance

**Mitigation**:
- ✅ Storage limits
- ✅ Warning before quota exceeded
- ✅ Clear old highlights option

**Current Status**: Sprint Mode has NO storage ✅

---

#### T7: Resource Exhaustion
**Scenario**: Malicious page causes performance degradation

**Attack Flow**:
1. Page with millions of text nodes
2. Extension tries to highlight all
3. Browser freezes

**Impact**:
- Poor user experience
- Browser crash

**Mitigation**:
- ⏳ Limit highlights per page
- ⏳ Debouncing/throttling
- ⏳ Performance monitoring

**Current Status**: TO BE ADDRESSED in Sprint 1 ⏳

---

## Attack Surface

### Content Scripts
**Exposed To**: Web page JavaScript and DOM

**Risks**:
- XSS injection
- CSS manipulation
- DOM clobbering

**Controls**:
- Shadow DOM
- Input sanitization
- Minimal DOM interaction

---

### Background Worker  
**Exposed To**: Extension messages

**Risks**:
- Message spoofing
- Resource exhaustion

**Controls**:
- Message validation
- Rate limiting

---

### Storage (Future - Vault Mode)
**Exposed To**: Other extensions (if permissions overlap)

**Risks**:
- Data theft
- Data corruption

**Controls**:
- Namespace storage keys
- Encryption at rest
- Validate on read

---

## Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Status |
|--------|-----------|--------|------------|--------|
| T1: XSS | High | Critical | **HIGH** | ✅ Mitigated |
| T2: CSS Injection | Medium | High | **MEDIUM** | ✅ Mitigated |
| T3: Data Exfiltration | Low | Critical | **MEDIUM** | ✅ N/A (Sprint Mode) |
| T4: Dependency Vuln | Medium | High | **MEDIUM** | ⚠️ Partial |
| T5: Phishing | Low | Medium | **LOW** | ⏳ Future |
| T6: Storage DoS | Low | Low | **LOW** | ✅ N/A (Sprint Mode) |
| T7: Resource Exhaustion | Medium | Low | **LOW** | ⏳ Sprint 1 |

---

## Security Testing Plan

### Automated Testing
- [ ] XSS injection tests (DOMPurify)
- [ ] URL validation tests
- [ ] CSP compliance tests
- [ ] Dependency audit (CI/CD)

### Manual Testing
- [ ] Penetration testing
- [ ] Code review
- [ ] Security audit (external)

### Continuous Monitoring
- [ ] Dependabot alerts
- [ ] CVE monitoring
- [ ] User security reports

---

## Incident Response Plan

### Detection
1. User reports
2. Automated monitoring
3. Security researcher disclosure

### Response
1. **Triage** (< 24 hours)
   - Severity assessment
   - Impact analysis
   - Containment strategy

2. **Fix** (< 72 hours for critical)
   - Develop patch
   - Test thoroughly
   - Prepare release

3. **Deploy** (< 1 week)
   - Emergency release
   - Force update if critical
   - User notification

4. **Disclosure** (90 days coordinated)
   - Public disclosure
   - Credits to researcher
   - Post-mortem

---

## Future Considerations

### Vault Mode
- End-to-end encryption
- Secure key management
- Sync protocol security
- Server-side validation

### Gen Mode
- API key protection
- Data minimization
- AI provider selection
- Prompt injection protection

---

**Last Updated**: 2025-12-27  
**Threat Model Version**: 1.0  
**Next Review**: Before Vault Mode implementation
