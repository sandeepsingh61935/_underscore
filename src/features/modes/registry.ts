import { MODE_NAMES } from '@/content/modes/mode-constants';
import { MODE_BRANDING } from '@/shared/constants/mode-branding';

export interface ModeDefinition {
    id: string;
    name: string;
    altName: string;
    family: string;
    tag: string;
    blurb: string;
    motif: string;
    accent: string;
    persistence: string;
    signin: boolean;
    /** Basic mode's TTL is user-configurable (see @/shared/constants/basic-ttl). */
    ttlConfigurable: boolean;
    enabled: boolean;
    order: number;
    badge?: string;
}

export class ModeRegistry {
    private static instance: ModeRegistry;
    private modes = new Map<string, ModeDefinition>();

    private constructor() {
        this.registerDefaults();
    }

    static getInstance(): ModeRegistry {
        if (!ModeRegistry.instance) {
            ModeRegistry.instance = new ModeRegistry();
        }
        return ModeRegistry.instance;
    }

    register(mode: ModeDefinition): void {
        this.modes.set(mode.id, mode);
    }

    get(id: string): ModeDefinition | undefined {
        return this.modes.get(id);
    }

    getAvailable(isAuthenticated: boolean): ModeDefinition[] {
        return Array.from(this.modes.values())
            .filter(m => m.enabled)
            .filter(m => !m.signin || isAuthenticated)
            .sort((a, b) => a.order - b.order);
    }

    private registerDefaults() {
        this.register({
            id: MODE_NAMES.BASIC,
            name: MODE_BRANDING.basic.displayName,
            altName: 'On this device',
            family: 'device',
            tag: MODE_BRANDING.basic.tagline,
            blurb: MODE_BRANDING.basic.description,
            motif: '◷',
            accent: 'var(--mode-basic)',
            persistence: 'configurable TTL · this device',
            signin: false,
            ttlConfigurable: true,
            enabled: true,
            order: 1,
        });

        this.register({
            id: MODE_NAMES.PRO,
            name: MODE_BRANDING.pro.displayName,
            altName: 'Synced',
            family: 'cloud',
            tag: MODE_BRANDING.pro.tagline,
            blurb: MODE_BRANDING.pro.description,
            motif: '◇',
            accent: 'var(--mode-pro)',
            persistence: 'synced · always',
            signin: true,
            ttlConfigurable: false,
            enabled: true,
            order: 2,
        });

        this.register({
            id: MODE_NAMES.PRO_XAI,
            name: MODE_BRANDING.pro_xai.displayName,
            altName: 'Synced + AI',
            family: 'cloud',
            tag: MODE_BRANDING.pro_xai.tagline,
            blurb: MODE_BRANDING.pro_xai.description,
            motif: '+',
            accent: 'var(--mode-pro-xai)',
            persistence: 'synced · readable by AI',
            signin: true,
            ttlConfigurable: false,
            enabled: true,
            order: 3,
        });
    }
}

export const modeRegistry = ModeRegistry.getInstance();
