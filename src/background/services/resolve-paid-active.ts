import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseBillingPort } from '@/shared/billing';

/**
 * Background commercial Paid flag. Fail closed on missing session or load error.
 */
export async function resolveBackgroundPaidActive(opts: {
  isAuthenticated: boolean;
  getSupabase: () => SupabaseClient | null;
}): Promise<boolean> {
  if (!opts.isAuthenticated) return false;
  const supabase = opts.getSupabase();
  if (!supabase) return false;
  try {
    const port = new SupabaseBillingPort({
      supabase,
      getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
    });
    const entitlement = await port.getEntitlement();
    return entitlement.isPaidActive;
  } catch {
    return false;
  }
}
