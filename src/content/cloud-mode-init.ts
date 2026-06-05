/**
 * Vault Mode Initialization
 *
 * This module initializes the Vault Mode service and sets up
 * the connection between the UI and the storage layer.
 * 
 * Now uses DualWriteRepository for automatic Supabase sync when authenticated.
 */

import { createCloudModeServiceWithCloudSync } from '@/services/cloud-mode-service-factory';

/**
 * Initialize Vault Mode
 *
 * - Opens IndexedDB connection
 * - Creates database schema if needed
 * - Restores any existing highlights for current URL
 * - Enables cloud sync to Supabase when authenticated
 */
export async function initializeCloudMode(): Promise<void> {
  try {
    console.warn('[CLOUD] Initializing Vault Mode with cloud sync...');

    const service = createCloudModeServiceWithCloudSync();




    // Restore highlights for current page
    const restored = await service.restoreHighlightsForUrl();

    console.warn(`[CLOUD] Initialized: ${restored.length} highlights restored`);
    restored.forEach((r) => {
      console.warn(`[CLOUD] - ${r.highlight.id}: ${r.restoredUsing} tier`);
    });

    // Expose service globally for debugging
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).cloudModeService = service;
      console.warn('[CLOUD] CloudModeService available as: window.cloudModeService');
    }
  } catch (error) {
    console.error('[CLOUD] Failed to initialize Vault Mode:', error);
    throw error;
  }
}

/**
 * Check if Vault Mode is enabled in settings
 */
export function isCloudModeEnabled(): boolean {
  // TODO: Check user settings/preferences
  // For now, return true to enable Vault Mode
  return true;
}
