/**
 * Vault Mode Initialization
 * 
 * This module initializes the Vault Mode service and sets up
 * the connection between the UI and the storage layer.
 */

import { getVaultModeService } from '@/services/vault-mode-service';

/**
 * Initialize Vault Mode
 * 
 * - Opens IndexedDB connection
 * - Creates database schema if needed
 * - Restores any existing highlights for current URL
 */
export async function initializeVaultMode(): Promise<void> {
    try {
        console.log('🔄 Initializing Vault Mode...');

        const service = getVaultModeService();

        // This will create the DB schema on first run
        await service.getStats();

        // Restore highlights for current page
        const restored = await service.restoreHighlightsForUrl();

        console.log(`✅ Vault Mode initialized: ${restored.length} highlights restored`);
        restored.forEach(r => {
            console.log(`  - ${r.highlight.id}: ${r.restoredUsing} tier`);
        });

        // Expose service globally for debugging
        if (typeof window !== 'undefined') {
            (window as any).vaultModeService = service;
            console.log('💡 VaultModeService available as: window.vaultModeService');
        }

    } catch (error) {
        console.error('❌ Failed to initialize Vault Mode:', error);
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
