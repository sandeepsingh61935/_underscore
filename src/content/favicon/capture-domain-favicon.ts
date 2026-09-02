/**
 * Best-effort: read the page icon, compress to ≤4KB, store once per domain.
 * Never blocks highlight create. CORS/local hosts are skipped.
 */

import { compressFaviconBitmap } from '@/shared/favicon/compress-favicon';
import {
  getDomainFavicon,
  putDomainFavicon,
} from '@/shared/favicon/domain-favicon-store';
import { faviconUrlForDomain } from '@/shared/utils/favicon-url';

export function pageFaviconHref(doc: Document = document): string | null {
  const link = doc.querySelector(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  );
  if (link instanceof HTMLLinkElement && link.href) return link.href;
  try {
    return new URL('/favicon.ico', doc.location.origin).href;
  } catch {
    return null;
  }
}

export async function captureDomainFavicon(domain: string): Promise<void> {
  if (!faviconUrlForDomain(domain)) return;
  const existing = await getDomainFavicon(domain);
  if (existing) return;

  const href = pageFaviconHref();
  if (!href) return;

  let bitmap: ImageBitmap;
  try {
    const res = await fetch(href, { credentials: 'omit', mode: 'cors' });
    if (!res.ok) return;
    const blob = await res.blob();
    if (blob.size < 16 || blob.size > 512 * 1024) return;
    bitmap = await createImageBitmap(blob);
  } catch {
    return;
  }

  try {
    const compressed = await compressFaviconBitmap(bitmap);
    if (!compressed) return;
    await putDomainFavicon(domain, compressed);
  } finally {
    bitmap.close();
  }
}

export function scheduleDomainFaviconCapture(pageUrl: string): void {
  try {
    const host = new URL(pageUrl).hostname;
    void captureDomainFavicon(host);
  } catch {
    /* ignore */
  }
}
