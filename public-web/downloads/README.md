# Extension download artifacts

Versioned zips served by the web app install page (`/install`):

- `underscore-highlighter-<version>-chrome.zip`
- `underscore-highlighter-<version>-firefox.zip`

**Do not hand-copy.** These files are refreshed by:

```bash
node scripts/sync-extension-downloads.mjs
# or any of:
npm run build          # wxt build + sync
npm run zip:chrome     # wxt zip + sync
npm run zip:firefox
npm run web:build      # sync then vite
npm run web:deploy:vercel
```

The script copies the newest matching zip from `.output/`, or zips
`.output/chrome-mv3` / `.output/firefox-mv3` when no zip artifact exists.

Names must match `src/web/install/install-distribution.ts`
(`package.json` version, or `VITE_EXTENSION_PACKAGE_VERSION`).
