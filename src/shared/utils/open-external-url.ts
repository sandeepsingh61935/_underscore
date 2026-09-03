/**
 * @file open-external-url.ts
 * @description Safe utility for opening an external URL in a new browser tab
 * whether running inside a Chrome extension (via chrome.tabs.create)
 * or in a web browser (via window.open).
 */

export function openExternalUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) return;

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      void chrome.tabs.create({ url: trimmed });
      return;
    }
  } catch {
    // Fall back to window.open if chrome.tabs.create throws
  }

  if (typeof window !== 'undefined') {
    window.open(trimmed, '_blank', 'noopener,noreferrer');
  }
}
