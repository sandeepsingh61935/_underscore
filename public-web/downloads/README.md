# Extension download artifacts

Versioned zips served by the web app install page (`/install`):

- `underscore-highlighter-<version>-chrome.zip`
- `underscore-highlighter-<version>-firefox.zip`

## Publish

From repo root (after a clean release build):

```bash
npm run zip:chrome
npm run zip:firefox
# Copy into this folder with the versioned names expected by
# src/web/install/install-distribution.ts (or set VITE_EXTENSION_PACKAGE_VERSION).
cp .output/underscore-highlighter-*-chrome.zip public-web/downloads/
cp .output/underscore-highlighter-*-firefox.zip public-web/downloads/
```

Confirm filenames match `getInstallDistributionConfig()` download hrefs before deploy.

## Ops

- `VITE_INSTALL_DISTRIBUTION_MODE=manual|stores|hybrid` (default manual)
- `VITE_CHROME_STORE_URL` / `VITE_FIREFOX_STORE_URL` when listings are public
- `VITE_EXTENSION_PACKAGE_VERSION` overrides the version label/path segment
