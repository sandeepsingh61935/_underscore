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
    /** Local QA only: allow selecting Account (Paid) without Polar sub */
    readonly VITE_BILLING_DEV_OVERRIDE?: string;
    /** Public web app origin for extension popup legal links (Privacy / Terms). */
    readonly VITE_WEB_APP_URL?: string;
}
