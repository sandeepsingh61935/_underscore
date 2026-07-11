/**
 * Service-worker-safe base64 helpers (no `window` / `btoa` dependency).
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    const pad = i + 1 >= bytes.length ? 2 : i + 2 >= bytes.length ? 1 : 0;
    output += BASE64_CHARS[(triple >> 18) & 63];
    output += BASE64_CHARS[(triple >> 12) & 63];
    output += pad >= 2 ? '=' : BASE64_CHARS[(triple >> 6) & 63];
    output += pad >= 1 ? '=' : BASE64_CHARS[triple & 63];
  }
  return output;
}

export function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/=+$/, '');
  const len = cleaned.length;
  const outLen = Math.floor((len * 3) / 4);
  const out = new Uint8Array(outLen);
  let j = 0;
  for (let i = 0; i < len; i += 4) {
    const a = BASE64_CHARS.indexOf(cleaned[i]!);
    const b = BASE64_CHARS.indexOf(cleaned[i + 1]!);
    const c = BASE64_CHARS.indexOf(cleaned[i + 2] ?? 'A');
    const d = BASE64_CHARS.indexOf(cleaned[i + 3] ?? 'A');
    const triple = (a << 18) | (b << 12) | (c << 6) | d;
    if (j < outLen) out[j++] = (triple >> 16) & 255;
    if (j < outLen) out[j++] = (triple >> 8) & 255;
    if (j < outLen) out[j++] = triple & 255;
  }
  return out;
}
