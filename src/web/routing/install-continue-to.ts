import { resolveSafeReturnTo } from './safe-return-to';

const PRODUCT_PREFIXES = ['/home', '/library', '/settings'] as const;

/** Router state carried to `/install` so Continue can return to the product. */
export type InstallContinueState = {
  from?: string;
};

export function readInstallContinueFrom(state: unknown): string | undefined {
  if (!state || typeof state !== 'object') return undefined;
  if (!('from' in state)) return undefined;
  const from = (state as InstallContinueState).from;
  return typeof from === 'string' ? from : undefined;
}

/**
 * Continue-without-installing may only return to product routes.
 * Marketing /install must not loop.
 */
export function resolveInstallContinueTo(from: string | null | undefined): string {
  const candidate = resolveSafeReturnTo(from, '/home');
  if (
    PRODUCT_PREFIXES.some(
      (prefix) =>
        candidate === prefix ||
        candidate.startsWith(`${prefix}?`) ||
        candidate.startsWith(`${prefix}/`)
    )
  ) {
    return candidate;
  }
  return '/home';
}
