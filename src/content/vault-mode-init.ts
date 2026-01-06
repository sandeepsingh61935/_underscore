/**
 * Vault Mode Initialization
 *
 * This module initializes the Vault Mode service and sets up
 * the connection between the UI and the storage layer.
 * 
 * Now uses DualWriteRepository for automatic Supabase sync when authenticated.
 */

import { createVaultModeServiceWithCloudSync } from '@/services/vault-mode-service-factory';

/**
 * Initialize Vault Mode
 *
 * - Opens IndexedDB connection
 * - Creates database schema if needed
 * - Restores any existing highlights for current URL
 * - Enables cloud sync to Supabase when authenticated
 */
export async function initializeVaultMode(): Promise<void> {
  try {
    console.warn('[VAULT] Initializing Vault Mode with cloud sync...');

    const service = createVaultModeServiceWithCloudSync();




    // Restore highlights for current page
    const restored = await service.restoreHighlightsForUrl();

    console.warn(`[VAULT] Initialized: ${restored.length} highlights restored`);
    restored.forEach((r) => {
      console.warn(`[VAULT] - ${r.highlight.id}: ${r.restoredUsing} tier`);
    });

    // Expose service globally for debugging
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).vaultModeService = service;
      console.warn('[VAULT] VaultModeService available as: window.vaultModeService');
    }
  } catch (error) {
    console.error('[VAULT] Failed to initialize Vault Mode:', error);
    throw error;
  }
}

/**
 * Check if Vault Mode is enabled in settings
 */
export function isVaultModeEnabled(): boolean {
  // TODO: Check user settings/preferences
  // For now, return true to enable Vault Mode
  return true;
}
