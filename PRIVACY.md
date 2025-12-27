# Privacy Policy
**Underscore Web Highlighter Extension**

*Last Updated: December 27, 2025*

---

## Overview

Underscore Web Highlighter ("we", "our", or "the Extension") is committed to protecting your privacy. This policy explains how we handle your data across our different highlighting modes.

---

## Data Collection by Mode

### Sprint Mode (Current - Privacy-First)

**What We Store Locally**:
- **Highlighted text and positions**: Per website, in encrypted form
- **Highlight colors and timestamps**: Metadata for your highlights  
- **Undo history**: Last 50 actions (in memory only, not persisted)

**Where It's Stored**:
- **Chrome extension storage** (chrome.storage.local)
- **Encrypted**: Per-website encryption using Web Crypto API
- **Local only**: Never sent to servers
- **Not synced**: Does not sync across devices

**How Long We Keep It**:
- **Active session**: Up to 4 hours from last activity
- **Automatic cleanup**: Every 5 minutes, expired data deleted
- **Browser restart**: Highlights survive if < 4 hours old
- **Undo history**: Lost on page reload (industry standard)

**Your Control**:
- **Clear current website**: Ctrl+Shift+U
- **Clear selection**: Double-click highlighted text
- **Undo**: Ctrl+Z (works during current session)
- **Switch to Vault Mode**: Explicit migration preserves data

**Privacy Guarantees**:
- ✅ No tracking or analytics
- ✅ No third-party data sharing
- ✅ Data never leaves your device
- ✅ Automatic expiration (4 hours)
- ✅ You control all deletions

### Vault Mode (Future Feature)

When Vault Mode is implemented, it will include:

**Data Stored Locally**:
- Highlighted text snippets
- Page URLs where highlights were created
- Highlight colors and notes
- Creation/modification timestamps

**Data Synchronized (Optional)**:
- If you enable sync: highlights will be encrypted and stored in your chosen cloud provider
- You control: whether to enable sync, which provider to use
- Encryption: End-to-end encryption for all synchronized data

**Data Retention**:
- You own your data
- You can export all data at any time
- You can delete all data at any time

### Gen Mode (Future Feature)

When Gen Mode is implemented:

**AI Processing**:
- Highlights may be processed for insights (only if you enable AI features)
- Processing happens locally when possible
- If cloud AI is used, data is anonymized and not stored

---

## Permissions Explained

### Required Permissions

**`activeTab`**:
- **Why**: To detect and highlight text on the current webpage
- **What We Do**: Read and modify page content to render highlights
- **What We Don't Do**: Access tabs you're not actively using

**`storage`**:
- **Why**: To save your settings and preferences
- **What We Do**: Store highlight color preferences, keyboard shortcuts
- **What We Don't Do**: Store your browsing history or personal data

### Future Permissions (Vault Mode)

**`storage.sync`** (optional):
- **Why**: To synchronize highlights across devices
- **What We Do**: Sync your highlights via your chosen cloud provider
- **What We Don't Do**: Access data from other extensions or browsers

---

## Third-Party Services

### Current (Sprint Mode)
- **None**: Sprint Mode uses zero third-party services

### Future (Vault Mode)
- **Supabase** (optional): For syncing highlights if you enable this feature
  - Open-source, privacy-focused backend
  - End-to-end encryption for your data
  - You can self-host if preferred

### Future (Gen Mode)
- **AI Services** (optional): For generating insights
  - Only if you explicitly enable AI features
  - Data anonymized before processing
  - You choose which AI provider to use

---

## Your Rights

You have the right to:

✅ **Access**: Export all your data at any time  
✅ **Delete**: Permanently delete all your data  
✅ **Portability**: Take your data to another service  
✅ **Transparency**: Know exactly what data we collect  
✅ **Control**: Enable/disable any data collection features  

---

## Security

We take security seriously:

- **Content Security Policy**: Prevents XSS attacks
- **DOMPurify**: Sanitizes all user input
- **No Tracking Scripts**: Zero third-party analytics
- **Open Source**: Code is publicly auditable
- **Regular Updates**: Security patches released promptly

---

## Children's Privacy

This extension is not directed at children under 13. We do not knowingly collect data from children.

---

## Changes to This Policy

We will notify users of any changes to this privacy policy through:
- Extension update notes
- In-app notification
- GitHub repository changelog

---

## Data Breach Policy

In the unlikely event of a data breach:
1. We will notify affected users within 72 hours
2. We will provide details of what data was affected
3. We will outline steps taken to prevent future breaches

---

## Contact

Questions about privacy?
- **GitHub**: [Open an issue](https://github.com/your-repo/issues)
- **Email**: privacy@example.com

---

## Open Source

This extension is open source:
- **Code**: Publicly available for audit
- **Issues**: Report security concerns via GitHub
- **Contributions**: Privacy improvements welcome

---

## Summary

**Sprint Mode** (Current):
- ✅ Zero data collection
- ✅ Complete privacy
- ✅ No tracking
- ✅ Local-only

**Vault Mode** (Future):
- ⚠️ Optional cloud sync
- ✅ End-to-end encryption
- ✅ You control your data
- ✅ Export/delete anytime

**Our Commitment**: Your privacy is our priority. We collect only what's necessary and never more than you explicitly allow.

---

*This is a draft privacy policy for the initial Sprint Mode release. It will be updated when Vault Mode and Gen Mode are implemented.*
