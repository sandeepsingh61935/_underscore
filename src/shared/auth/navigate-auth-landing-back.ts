/**
 * History-aware Back for the web auth landing (SignInView).
 *
 * Locked decision: history.back() when there is a same-origin previous entry;
 * otherwise fall back to returnTo (if present) or /settings.
 */

export type AuthLandingBackTarget =
  | { kind: 'history' }
  | { kind: 'path'; path: string };

export interface ResolveAuthLandingBackInput {
  /** Query param returnTo (may be relative or absolute same-app path). */
  returnTo?: string | null;
  /** Defaults to window.history.length when available. */
  historyLength?: number;
  /** Defaults to document.referrer when available. */
  referrer?: string;
  /** Defaults to window.location.origin when available. */
  origin?: string;
  /**
   * Resolve a returnTo value to an in-app path.
   * Injected so this module stays free of router imports in unit tests.
   */
  resolveReturnTo?: (returnTo: string) => string;
}

function readHistoryLength(): number {
  if (typeof window === 'undefined') return 0;
  return window.history.length;
}

function readReferrer(): string {
  if (typeof document === 'undefined') return '';
  return document.referrer || '';
}

function readOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/**
 * Returns where auth-landing Back should go.
 * Pure given inputs (defaults read from the browser when omitted).
 */
export function resolveAuthLandingBack(
  input: ResolveAuthLandingBackInput = {},
): AuthLandingBackTarget {
  const historyLength = input.historyLength ?? readHistoryLength();
  const referrer = input.referrer ?? readReferrer();
  const origin = input.origin ?? readOrigin();

  if (historyLength > 1 && referrer && origin) {
    try {
      const refOrigin = new URL(referrer).origin;
      if (refOrigin === origin) {
        return { kind: 'history' };
      }
    } catch {
      // Malformed referrer — fall through.
    }
  }

  const returnTo = input.returnTo?.trim();
  if (returnTo) {
    const path = input.resolveReturnTo
      ? input.resolveReturnTo(returnTo)
      : returnTo;
    return { kind: 'path', path };
  }

  return { kind: 'path', path: '/settings' };
}

/**
 * Execute Back for the web auth landing.
 */
export function navigateAuthLandingBack(options: {
  returnTo?: string | null;
  navigate: (path: string) => void;
  resolveReturnTo?: (returnTo: string) => string;
  historyBack?: () => void;
}): void {
  const target = resolveAuthLandingBack({
    returnTo: options.returnTo,
    resolveReturnTo: options.resolveReturnTo,
  });

  if (target.kind === 'history') {
    if (options.historyBack) {
      options.historyBack();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
    return;
  }

  options.navigate(target.path);
}
