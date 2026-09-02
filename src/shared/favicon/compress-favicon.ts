/**
 * Cap stored domain icons. 32px WebP/PNG is typically well under 4KB.
 * Never persist an original ico/png dump — always recompress.
 */

export const FAVICON_EDGE_PX = 32;
export const FAVICON_MAX_BYTES = 4 * 1024;

export type CompressedFavicon = {
  mime: 'image/webp' | 'image/png';
  bytes: ArrayBuffer;
};

export function selectCompressedFavicon(
  candidates: ReadonlyArray<{ mime: string; bytes: ArrayBuffer }>
): CompressedFavicon | null {
  const ok = candidates
    .filter(
      (c) =>
        (c.mime === 'image/webp' || c.mime === 'image/png') &&
        c.bytes.byteLength > 32 &&
        c.bytes.byteLength <= FAVICON_MAX_BYTES
    )
    .sort((a, b) => a.bytes.byteLength - b.bytes.byteLength);
  const best = ok[0];
  if (!best) return null;
  return { mime: best.mime as CompressedFavicon['mime'], bytes: best.bytes };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Draw any decoded bitmap to 32×32 and keep the smaller of WebP/PNG under cap.
 */
export async function compressFaviconBitmap(
  source: CanvasImageSource,
  canvasFactory: () => HTMLCanvasElement = () => document.createElement('canvas')
): Promise<CompressedFavicon | null> {
  const canvas = canvasFactory();
  canvas.width = FAVICON_EDGE_PX;
  canvas.height = FAVICON_EDGE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, FAVICON_EDGE_PX, FAVICON_EDGE_PX);
  ctx.drawImage(source, 0, 0, FAVICON_EDGE_PX, FAVICON_EDGE_PX);

  const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.55);
  const pngBlob = await canvasToBlob(canvas, 'image/png');
  const candidates: Array<{ mime: string; bytes: ArrayBuffer }> = [];
  if (webpBlob) {
    candidates.push({ mime: 'image/webp', bytes: await webpBlob.arrayBuffer() });
  }
  if (pngBlob) {
    candidates.push({ mime: 'image/png', bytes: await pngBlob.arrayBuffer() });
  }
  return selectCompressedFavicon(candidates);
}
