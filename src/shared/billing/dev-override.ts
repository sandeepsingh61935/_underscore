/**
 * Local QA only — treat user as paid without a Polar sub.
 *
 * Requires BOTH:
 * - VITE_BILLING_DEV_OVERRIDE=true
 * - VITE_ALLOW_BILLING_DEV_OVERRIDE=true
 *
 * WXT hardcodes mode: 'development' for extension builds, so MODE/PROD alone
 * cannot gate release. Never set the allow flag in release CI/env (WP-8).
 *
 * Pass `env` in unit tests; production call sites omit it and use import.meta.env.
 */
export function isBillingDevOverrideEnabled(
  env?: Record<string, string | boolean | undefined>
): boolean {
  try {
    const e =
      env ??
      (
        import.meta as ImportMeta & {
          env?: Record<string, string | boolean | undefined>;
        }
      ).env ??
      {};

    if (e['PROD'] === true || e['MODE'] === 'production') {
      return false;
    }
    if (e['VITE_ALLOW_BILLING_DEV_OVERRIDE'] !== 'true') {
      return false;
    }
    return e['VITE_BILLING_DEV_OVERRIDE'] === 'true';
  } catch {
    return false;
  }
}
