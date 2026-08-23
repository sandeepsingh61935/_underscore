/**
 * DOM presence signal for the web app install gate.
 * Content script (isolated world) can still write page DOM attributes;
 * this does not require externally_connectable messaging.
 */

export const UNDERSCORE_EXT_ATTR = 'data-underscore-ext';
export const UNDERSCORE_EXT_EVENT = 'underscore-extension-ready';

export function announceExtensionPresence(version: string): void {
  try {
    const v = version.trim() || '1';
    document.documentElement.setAttribute(UNDERSCORE_EXT_ATTR, v);
    window.dispatchEvent(
      new CustomEvent(UNDERSCORE_EXT_EVENT, { detail: { version: v } }),
    );
  } catch {
    // Page may be locked down; detection falls back to runtime ping.
  }
}

export function readAnnouncedExtensionVersion(
  root: ParentNode = document,
): string | null {
  try {
    const el =
      root instanceof Document
        ? root.documentElement
        : (root as Element).ownerDocument?.documentElement;
    const v = el?.getAttribute(UNDERSCORE_EXT_ATTR)?.trim();
    return v || null;
  } catch {
    return null;
  }
}
