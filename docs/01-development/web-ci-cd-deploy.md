# Web CI/CD — GitHub Actions deploy

Production web deploys run from **GitHub Actions** on every push to `main`
(and via **Actions → Deploy Web → Run workflow**).

| Target | Command (local) | CI job |
|--------|-----------------|--------|
| Cloudflare Pages | `npm run web:deploy` | `Deploy Web` → Cloudflare step |
| Vercel | `npm run web:deploy:vercel` | `Deploy Web` → Vercel step |

Workflow file: `.github/workflows/deploy-web.yml`

Quality checks remain separate (`.github/workflows/quality.yml`). Deploy does
not wait on that workflow; keep `main` green before merging.

---

## One-time secret setup

Repo → **Settings → Secrets and variables → Actions**.  
Optional: create Environment **`production`** and attach the same secrets there
(workflow uses `environment: production`).

### Required — Vite / SPA build

| Secret | Notes |
|--------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon (public) key |
| `VITE_WEB_APP_URL` | Canonical origin, e.g. Cloudflare or Vercel prod URL |

### Optional — product config

| Secret | Notes |
|--------|--------|
| `VITE_GOOGLE_CLIENT_ID` | Google sign-in on web |
| `VITE_MCP_CLOUD_URL` | MCP cloud endpoint |
| `VITE_MCP_ENV` | e.g. `production` |
| `VITE_AUTH_EMAIL_UI` | Email auth UI flag |
| `VITE_INSTALL_DISTRIBUTION_MODE` | `manual` / `stores` / `hybrid` |
| `VITE_EXTENSION_PACKAGE_VERSION` | Install zip version label |
| `VITE_EXTENSION_ID` | Chrome extension id |
| `VITE_CHROME_STORE_URL` | CWS listing when live |
| `VITE_FIREFOX_STORE_URL` | AMO listing when live |
| `SUPABASE_TIMEOUT_MS` | Client timeout override |

Copy values from local `.env.production` (never commit that file).

### Required — Cloudflare Pages

| Secret | Notes |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Token with **Account → Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → account id |

Project name is fixed: `underscore-web` (see `wrangler.web.toml`).

Create token: [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
→ “Edit Cloudflare Workers” template is usually enough for Pages deploy.

### Required — Vercel

| Secret | Notes |
|--------|--------|
| `VERCEL_TOKEN` | **Account** token from [vercel.com/account/tokens](https://vercel.com/account/tokens) — **not** the local CLI session token (`vca_*` in `~/.local/share/com.vercel.cli/auth.json`). Those expire and fail in CI. |
| `VERCEL_ORG_ID` | From `.vercel/project.json` → `orgId` (after `vercel link`) |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` → `projectId` |

```bash
# After creating the token in the Vercel dashboard:
printf '%s' 'YOUR_ACCOUNT_TOKEN' | gh secret set VERCEL_TOKEN
```

`.vercel/` is gitignored; CI synthesizes the link file from org/project secrets.

Local reference (do not commit):

```bash
cat .vercel/project.json
# {"projectId":"prj_…","orgId":"team_…","projectName":"underscore-web"}
```

---

## Manual run

1. GitHub → **Actions** → **Deploy Web** → **Run workflow**
2. Choose target: `both` | `cloudflare` | `vercel`

---

## Local parity

```bash
# Cloudflare Pages (main)
npm run web:deploy

# Vercel production
npm run web:deploy:vercel
```

Both package extension zips into `public-web/downloads` for `/install`.

---

## Pages Functions secrets (not GitHub)

LLM proxy and other **Cloudflare Pages Function** secrets stay in the Cloudflare
dashboard / `wrangler pages secret` — they are not `VITE_*` and are not
re-set by this workflow. See ADR-027 and `docs/05-quality-framework/web-oauth-deploy-checklist.md`.

---

## Failure checklist

| Symptom | Check |
|---------|--------|
| “Missing required secret” | Add secret names exactly as in the table |
| Wrangler auth error | Token scope + `CLOUDFLARE_ACCOUNT_ID` |
| Vercel “no project” | `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` match linked project |
| Auth broken after deploy | `VITE_WEB_APP_URL` + Supabase redirect allow-list |
| Stale `/install` zips | Ensure `zip:all` step ran (workflow always runs it) |
