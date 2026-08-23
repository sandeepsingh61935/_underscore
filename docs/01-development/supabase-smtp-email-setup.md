# Supabase SMTP + Auth Email Templates

## Product UI note (Google-first)

Default auth landings (web `SignInView` + popup `AuthView`) show **Continue with Google only**.
Email/password APIs, OTP routes (`/verify-email`, forgot/reset), and Supabase Email provider stay enabled.
To re-expose email fields in the UI at build time:

```bash
VITE_AUTH_EMAIL_UI=true
```

Only the string `true` enables the form (`isAuthEmailUiEnabled()`).

---

underscore uses **6-digit OTP** emails (not magic links) for:

| Flow | Supabase template | App consumer |
|------|-------------------|--------------|
| Signup confirm | `confirmation` | Web `/verify-email`, extension VerificationView — `verifyOtp({ type: 'email' })` |
| Password reset | `recovery` | Web + popup reset — `verifyOtp({ type: 'recovery' })` then `updateUser({ password })` |

The app never sends mail. **Supabase Auth** sends it via built-in mailer (dev-only / limited) or **your SMTP**.

Repo sources of truth for local CLI:

- `supabase/config.toml` → `[auth.email]`, templates
- `supabase/templates/confirmation.html`
- `supabase/templates/recovery.html`

**Hosted projects do not read `config.toml` automatically.** You must mirror settings in the Supabase Dashboard (or Management API).

---

## 0. Pick environment

| Environment | Where mail goes | What to do |
|-------------|-----------------|------------|
| **Local** (`supabase start`) | [Inbucket](http://127.0.0.1:54324) | No real SMTP required. Open Inbucket after signup. |
| **Hosted** (staging/prod) | Real inbox | Configure SMTP + templates + Auth email toggles below. |

If you signed up against hosted and never got mail, you need **§1–4**.

---

## 1. Auth email toggles (Dashboard)

Project → **Authentication** → **Providers** → **Email**

1. **Enable Email provider** — ON  
2. **Confirm email** — ON (required for OTP signup gate)  
3. Leave magic-link-only flows off unless you intentionally add them; underscore UI expects a **6-digit code**.

Project → **Authentication** → **URL Configuration**

1. **Site URL** — production web origin (e.g. `https://app.yourdomain.com`)  
2. **Redirect URLs** — include every web origin you use for auth callbacks, e.g.  
   - `http://127.0.0.1:3000/**` (local web)  
   - `http://localhost:3000/**`  
   - `https://app.yourdomain.com/**`  
   Extension password/OTP flows do **not** rely on email links (code entry in UI), but Site URL still matters for Supabase defaults.

Project → **Authentication** → **Rate Limits** (optional)

- Keep email send limits modest (inbox bombing risk). Local `config.toml` uses `email_sent = 10` / hour when SMTP is on.

---

## 2. SMTP (recommended: Resend)

Built-in Supabase mailer is fine for a smoke test; it rate-limits and often lands in spam. Use real SMTP for anything users touch.

### 2a. Create a Resend account

1. Sign up at [resend.com](https://resend.com)  
2. **Domains** → add + verify your sending domain (DNS: SPF, DKIM)  
   - Until verified, Resend only allows their onboarding test sender (limited).  
3. **API Keys** → create key with sending permission. Copy once; store in a password manager — **never commit**.

### 2b. Dashboard SMTP

Project → **Project Settings** → **Authentication** → **SMTP Settings**  
(or **Authentication** → **Emails** → **SMTP** depending on dashboard version)

| Field | Value |
|-------|--------|
| Enable custom SMTP | ON |
| Sender email | `auth@yourdomain.com` (must be allowed by Resend domain) |
| Sender name | `underscore` |
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | Resend API key (`re_...`) |
| Minimum interval | ≥ 20s (matches app resend cooldown intent) |

Save. Use **Send test email** if the UI offers it.

### 2c. Alternatives (same Dashboard fields)

| Provider | Host | User | Pass |
|----------|------|------|------|
| **SendGrid** | `smtp.sendgrid.net` | `apikey` | SendGrid API key |
| **Postmark** | `smtp.postmarkapp.com` | server token | server token |
| **Amazon SES** | region endpoint | SMTP user | SMTP password |

### 2d. Local CLI with real SMTP (optional)

Default local stack uses Inbucket (`[local_smtp]`). To force real SMTP in local GoTrue, uncomment and fill in `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 587
user = "resend"
pass = "env(RESEND_API_KEY)"
admin_email = "auth@yourdomain.com"
sender_name = "underscore"
```

Put `RESEND_API_KEY` in the env used by `supabase start` (not in git). Restart local Supabase after changes.

Prefer Inbucket for day-to-day dev so you do not burn send quota.

---

## 3. Email templates (OTP body)

Dashboard → **Authentication** → **Email Templates**

For each template below:

1. Open the template  
2. Set **Subject**  
3. Paste **HTML** from the repo file (or Dashboard source editor)  
4. Ensure the body contains **`{{ .Token }}`** (the 6-digit code).  
5. Do **not** rely only on `{{ .ConfirmationURL }}` — the app verifies OTP, not the link.

### Confirm signup

- **Subject:** `Confirm your _underscore signup`  
- **Source:** `supabase/templates/confirmation.html`  
- **Required variable:** `{{ .Token }}`

### Reset password

- **Subject:** `Reset your _underscore password`  
- **Source:** `supabase/templates/recovery.html`  
- **Required variable:** `{{ .Token }}`

Optional later: invite / magic link / change email — not required for current underscore flows.

### OTP length / expiry (hosted)

Dashboard may expose these under Auth email settings. Mirror local intent:

| Setting | Value |
|---------|--------|
| OTP length | **6** |
| OTP expiry | **600** seconds (10 min) |

If the hosted UI does not expose length, default is usually 6–8; app validates **exactly 6 digits** (`/^\d{6}$/`). If Supabase ever sends longer codes, either change app validation or force 6 in project config.

---

## 4. End-to-end verify

1. Confirm app env points at **this** project:  
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (web + extension build).  
2. Sign up with a **real inbox you control** (or +alias).  
3. App should land on **verify email** and wait for a code — not a full session yet.  
4. Inbox (and spam): email from your sender with **6-digit** code.  
5. Enter code → session created → account usable.  
6. Sign out → **Forgot password** → recovery email → code → new password → sign in.  
7. Dashboard → **Authentication** → **Users**: user exists; after verify, email confirmed.  
8. **Authentication** → **Logs**: signup / recovery / errors if mail fails.

### Common failures

| Symptom | Likely cause |
|---------|----------------|
| No email, user row created, unconfirmed | SMTP off / wrong password / domain not verified |
| No email, no user | Wrong Supabase project in env; signup error |
| Email has only a link, no code | Template missing `{{ .Token }}`; still using default magic-link style |
| “Invalid code” always | Wrong template type; OTP expired; length ≠ 6 |
| Works in Inbucket only | You are on local Supabase — expected without SMTP |
| Rate limit errors | Resend/Supabase hourly caps; wait or raise carefully |

---

## 5. Security notes

- Never commit SMTP passwords or Resend keys.  
- Prefer a dedicated `auth@` mailbox/domain.  
- Keep confirmations **ON** in production.  
- Do not raise `email_sent` rate limits without abuse controls.  
- Recovery OTP grants a session on success — short expiry (10 min) is intentional.

---

## 6. Checklist (copy/paste)

- [ ] Email provider ON, Confirm email ON  
- [ ] Site URL + redirect allow-list set  
- [ ] Custom SMTP ON with verified domain  
- [ ] Confirmation template subject + HTML with `{{ .Token }}`  
- [ ] Recovery template subject + HTML with `{{ .Token }}`  
- [ ] OTP length 6 / expiry ~10 min  
- [ ] App env → correct project  
- [ ] Signup → inbox code → verify  
- [ ] Forgot password → recovery code → reset  
