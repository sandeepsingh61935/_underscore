/**
 * Defense-in-depth: only open Polar-controlled checkout/portal hosts.
 */

const ALLOWED_HOSTS = new Set([
  'polar.sh',
  'www.polar.sh',
  'sandbox.polar.sh',
  'buy.polar.sh',
]);

export function assertPolarCheckoutUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Billing provider returned an unexpected URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Billing provider returned an unexpected URL');
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error('Billing provider returned an unexpected URL');
  }

  return url;
}

export function isPolarCheckoutHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname);
}
