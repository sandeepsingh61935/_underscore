/**
 * Pick high-contrast delete-icon chrome from a sampled page background.
 * Fallback: solid dark chip + light glyph (never pastel-only).
 */

export type DeleteIconChrome = {
  background: string;
  color: string;
  border: string;
  boxShadow: string;
  /** 'dark' | 'light' chip relative to page */
  tone: 'dark' | 'light';
};

export type Rgb = { r: number; g: number; b: number };

/** Relative luminance 0–1 (sRGB). */
export function relativeLuminance(rgb: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(rgb.r);
  const G = lin(rgb.g);
  const B = lin(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function parseCssColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();
  if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1]!;
    if (h.length === 3) {
      return {
        r: parseInt(h[0]! + h[0]!, 16),
        g: parseInt(h[1]! + h[1]!, 16),
        b: parseInt(h[2]! + h[2]!, 16),
      };
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgb) {
    const a = rgb[4] !== undefined ? Number(rgb[4]) : 1;
    if (a < 0.15) return null;
    return {
      r: Math.min(255, Math.round(Number(rgb[1]))),
      g: Math.min(255, Math.round(Number(rgb[2]))),
      b: Math.min(255, Math.round(Number(rgb[3]))),
    };
  }
  return null;
}

/** White + black rings so the chip stays visible even if tone guess is wrong. */
const KNOCKOUT_ON_DARK =
  '0 0 0 1px #ffffff, 0 0 0 2px #111111, 0 2px 10px rgba(0,0,0,0.35)';
const KNOCKOUT_ON_LIGHT =
  '0 0 0 1px #111111, 0 0 0 2px #ffffff, 0 2px 10px rgba(0,0,0,0.45)';

export const DARK_DELETE_ICON_CHROME: DeleteIconChrome = {
  background: '#1a1a1a',
  color: '#fafafa',
  border: '1px solid rgba(255,255,255,0.4)',
  boxShadow: KNOCKOUT_ON_DARK,
  tone: 'dark',
};

export const LIGHT_DELETE_ICON_CHROME: DeleteIconChrome = {
  background: '#f5f5f5',
  color: '#141414',
  border: '1px solid rgba(0,0,0,0.35)',
  boxShadow: KNOCKOUT_ON_LIGHT,
  tone: 'light',
};

/** Default when sample is missing on a light (or unknown) page. */
export const FALLBACK_DELETE_ICON_CHROME: DeleteIconChrome = {
  ...DARK_DELETE_ICON_CHROME,
};

export function resolveDeleteIconChrome(
  pageBg: Rgb | null,
  options?: { prefersDark?: boolean }
): DeleteIconChrome {
  if (!pageBg) {
    return options?.prefersDark
      ? { ...LIGHT_DELETE_ICON_CHROME }
      : { ...FALLBACK_DELETE_ICON_CHROME };
  }

  const L = relativeLuminance(pageBg);
  // Light page → dark chip; dark page → light chip
  return L >= 0.45 ? { ...DARK_DELETE_ICON_CHROME } : { ...LIGHT_DELETE_ICON_CHROME };
}

/** Apply chrome with !important so host `button { color: #000 !important }` cannot hide it. */
export function applyDeleteIconChrome(el: HTMLElement, chrome: DeleteIconChrome): void {
  el.style.setProperty('background', chrome.background, 'important');
  el.style.setProperty('color', chrome.color, 'important');
  el.style.setProperty('border', chrome.border, 'important');
  el.style.setProperty('box-shadow', chrome.boxShadow, 'important');
  el.dataset['chromeTone'] = chrome.tone;
}

/** Prefer document color-scheme, then OS preference. */
export function pagePrefersDark(doc: Document = document): boolean {
  try {
    const view = doc.defaultView;
    const scheme = view ? view.getComputedStyle(doc.documentElement).colorScheme : '';
    if (/\bdark\b/i.test(scheme) && !/\blight\b/i.test(scheme)) return true;
    if (/\blight\b/i.test(scheme) && !/\bdark\b/i.test(scheme)) return false;
    return view?.matchMedia?.('(prefers-color-scheme: dark)')?.matches === true;
  } catch {
    return false;
  }
}

/**
 * Walk elementFromPoint chain for an opaque-ish background color.
 */
export function samplePageBackgroundAt(
  clientX: number,
  clientY: number,
  doc: Document = document
): Rgb | null {
  if (typeof doc.elementFromPoint !== 'function') return null;
  const stack: Element[] = [];
  let el: Element | null = doc.elementFromPoint(clientX, clientY);
  let guard = 0;
  while (el && guard++ < 12) {
    stack.push(el);
    if (el === doc.documentElement || el === doc.body) break;
    el = el.parentElement;
  }
  // Prefer deeper painted ancestors; skip our own icon
  for (const node of stack) {
    if ((node as HTMLElement).classList?.contains('underscore-delete-icon')) {
      continue;
    }
    const cs = doc.defaultView?.getComputedStyle(node as Element);
    if (!cs) continue;
    const bg = parseCssColor(cs.backgroundColor);
    if (bg) return bg;
  }
  const bodyBg = doc.defaultView
    ? parseCssColor(doc.defaultView.getComputedStyle(doc.body).backgroundColor)
    : null;
  if (bodyBg) return bodyBg;
  const htmlBg = doc.defaultView
    ? parseCssColor(doc.defaultView.getComputedStyle(doc.documentElement).backgroundColor)
    : null;
  return htmlBg;
}
