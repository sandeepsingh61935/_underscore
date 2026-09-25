/**
 * WXT's dev background reloads every tab matching a content script.
 * Our highlighter matches all http(s) pages, so every rebuild refreshes
 * the whole browser. Insert an early return so CS still re-registers
 * without chrome.tabs.reload.
 */
export function skipWxtContentScriptTabReloadTransform(code: string): string | null {
  if (!code.includes('reloadTabsForContentScript')) return null;
  const next = code.replace(
    /async function reloadTabsForContentScript\([^)]*\)\s*\{/,
    (open) => `${open}return;`
  );
  return next === code ? null : next;
}
