/// <reference types="vite/client" />

/**
 * Typed import.meta.env shim.
 *
 * `vite/client` declares `interface ImportMetaEnv { [key: string]: any }` which triggers
 * `noPropertyAccessFromIndexSignature` (TS4111) on every `import.meta.env.VITE_*` access.
 * Augmenting here with named optional properties restores dot-access and silences
 * TS4111 in 9 web-context files. Add new VITE_ vars here when introduced.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Public web app origin for Polar success/cancel redirects */
  readonly VITE_APP_ORIGIN?: string;
  readonly VITE_BILLING_APP_ORIGIN?: string;
  /** Local QA only: treat user as paid without Polar sub */
  readonly VITE_BILLING_DEV_OVERRIDE?: string;
  /**
   * Must also be true for VITE_BILLING_DEV_OVERRIDE (WP-8).
   * Never set in release CI — WXT uses mode=development for extension builds.
   */
  readonly VITE_ALLOW_BILLING_DEV_OVERRIDE?: string;
  /** Public web app origin for extension popup legal links (Privacy / Terms). */
  readonly VITE_WEB_APP_URL?: string;
  /** When "true", show email/password on auth landings. Default: Google-only UI. */
  readonly VITE_AUTH_EMAIL_UI?: string;
  /** Cloud MCP Streamable HTTP URL (Integrations product path). */
  readonly VITE_MCP_CLOUD_URL?: string;
}
