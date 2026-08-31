# Privacy Policy

**Underscore Highlighter** (browser extension and web app)

**Last updated:** 21 August 2026

This policy describes how Underscore Highlighter (“Underscore”, “we”, “the
product”) handles information when you use the browser extension and the related
web app.

For store listings, the canonical public URL should point at the hosted copy of
this policy (web app `/privacy` once deployed), not only this repository file.

---

## Summary

- **Guest (signed out):** highlights and preferences stay in the browser on your
  device. They are not uploaded to our servers.
- **Signed in:** account email (and related auth data) and library data you
  choose to sync are processed by our backend so you can sign in, sync, and use
  paid features.
- **Optional AI:** only if you connect a provider. Cloud providers receive what
  you send in that request (using **your** API key or local runtime). We do not
  sell your highlights.
- **No third-party ad trackers.** We do not sell personal information.

---

## Who this applies to

- The **browser extension** (Chrome, Firefox, and other Chromium builds we
  distribute)
- The **web app** served from our Cloudflare Pages project (and any custom
  domain we point at it)

---

## Information we process

### 1. Highlights and page context (core product)

When you create a highlight, the product may store:

- Selected text and surrounding context needed to restore the highlight
- Page URL, domain, and path
- Timestamps, colors, notes, tags, and similar metadata you add
- Presentation preferences (for example type presets)

**Guest / device-local use:** this data is stored in extension or browser
storage on your device (for example `storage.local` / IndexedDB). It is not sent
to Underscore servers for sync while you remain signed out.

**Signed-in sync:** when your account and mode support cloud sync, library data
is transmitted to and stored on our backend (Supabase) so it can appear across
devices and in the web app. Highlight text is stored for sync as product data;
it is protected by account authentication and transport encryption (HTTPS). It
is **not** described here as end-to-end encrypted client-side before upload.

### 2. Account and authentication

If you create or use an account, we process:

- Email address
- Authentication identifiers and session tokens
- Optional profile fields provided by the identity provider (for example display
  name or avatar URL from Google sign-in)
- Security-related signals needed to prevent abuse (for example rate limits on
  auth attempts)

Sign-in may use:

- Email and password / one-time codes via **Supabase Auth**
- Google OAuth via the browser **identity** API and Supabase

### 3. Billing (paid plans)

If you start a paid plan, payment is handled by **Polar** (our merchant of
record). We receive subscription status and related entitlement signals needed
to unlock paid features. Card numbers are handled by the payment provider, not
stored in the extension.

### 4. Optional AI features

AI is optional and user-configured:

- **Bring-your-own-key (BYOK)** providers (for example OpenAI, Anthropic,
  Google, xAI, OpenRouter): API keys you enter are stored in extension storage
  on your device. Requests go to those providers (or via our web app proxy where
  documented) with content needed for the feature you invoked.
- **Local Ollama:** if you enable it, the extension may contact `localhost` /
  `127.0.0.1` on the Ollama port you use. Data stays on your machine except as
  your local stack is configured.
- **MCP bridge:** if you enable a local agent bridge, the extension may open a
  connection to a local bridge port on your machine.

We do not require AI for core highlighting or the local library.

### 5. Product analytics

The web app may emit **in-process** product events (feature names and
non-content properties) on an internal event bus for future sinks. **As of this
policy date, we do not send those events to a third-party analytics vendor.** We
do not put highlight text into analytics events.

### 6. What we do not do

- We do not sell your personal information
- We do not run third-party advertising trackers in the extension
- We do not read your full browsing history; we process pages in context of
  highlighting, the active tab you use with the product, and library URLs you
  save
- We do not require an account for guest highlighting on the extension

---

## Permissions (extension)

| Permission / access                            | Purpose                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `activeTab`                                    | Work with the page you are using when you highlight or open the popup     |
| `storage`                                      | Save library data, preferences, sessions, and optional API keys on device |
| `alarms`                                       | Maintenance tasks (for example session / verification timing)             |
| `identity`                                     | Complete browser OAuth (Google) securely                                  |
| Host access to our Supabase project            | Auth, sync, and account APIs                                              |
| Host access to Polar                           | Paid checkout                                                             |
| Host access to optional LLM APIs               | Only for providers you configure                                          |
| `localhost` / `127.0.0.1` (Ollama, MCP bridge) | Optional local AI / agent features you enable                             |

Firefox listings also declare built-in **data collection permissions** for
website content, website activity (URLs tied to highlights), personally
identifying info (account email), and authentication info. Those declarations
match this policy.

---

## Third parties

| Party                        | Role                                                            |
| ---------------------------- | --------------------------------------------------------------- |
| **Supabase**                 | Auth, database, and related backend APIs for signed-in features |
| **Cloudflare**               | Hosting the web app and edge functions                          |
| **Polar**                    | Payments and subscriptions                                      |
| **Google**                   | Optional OAuth sign-in                                          |
| **LLM providers you choose** | Optional AI requests under their policies and your keys         |
| **Browser vendors**          | Extension distribution and browser identity APIs                |

Each provider has its own privacy policy. Optional providers are only used when
you enable the related feature.

---

## Retention

- **Guest / device data:** until you delete it, clear site data, or uninstall
  the extension (subject to browser storage limits)
- **Account library data:** until you delete items, clear account data in
  product controls, or delete the account
- **Auth sessions:** until sign-out, expiry, or revocation
- **Billing records:** retained as required for accounting and the payment
  provider’s obligations

---

## Your choices and rights

Depending on your region, you may have rights to access, correct, export,
delete, or restrict processing of personal data.

In product:

- Use **Guest** without an account (extension)
- **Export** library data where the export feature is available for your plan
- **Delete** highlights, clear local highlight data, or sign out
- Disconnect optional AI providers and remove stored API keys
- Disable optional local bridges

To request account deletion or privacy help, contact us (below). We will respond
within a reasonable period and as required by law.

---

## Children

The product is not directed at children under 13 (or the minimum age required in
your jurisdiction). Do not use the product if you are under that age.

---

## International transfers

Our infrastructure may process data in the United States or other countries
where our providers operate. Where required, we rely on appropriate safeguards
offered by those providers.

---

## Security

We use industry-standard transport encryption (HTTPS), account authentication,
browser extension isolation, input sanitization for rendered content, and
least-privilege host permissions. No method of transmission or storage is
perfectly secure.

---

## Changes

We may update this policy as the product changes. We will update the “Last
updated” date and, for material changes, provide additional notice in the
product or store listing when appropriate.

---

## Contact

- **Email:** privacy@underscore.dev
- **Source / issues:** https://github.com/sandeepsingh61935/_underscore

If you need a postal address for a regulatory request, contact the email above
and we will provide one.

---

## License note

The project source is distributed under the terms in the repository `LICENSE`
file (GNU GPL v3). Licensing is separate from this privacy policy.
