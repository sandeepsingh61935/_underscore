import { MODE_NAMES } from '@/content/modes/mode-constants';

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
    ttl: boolean;
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
            id: MODE_NAMES.EPHEMERAL,
            name: 'Ephemeral',
            altName: 'Non-persistent',
            family: 'local',
            tag: '24-hour memory',
            blurb: 'Highlights live on this device and fade after 24 hours.',
            motif: '◷',
            accent: 'var(--mode-ephemeral)',
            persistence: 'auto-expires · 24h',
            signin: false,
            ttl: true,
            enabled: true,
            order: 1,
        });

        this.register({
            id: MODE_NAMES.LOCAL,
            name: 'Local',
            altName: 'Persistent local',
            family: 'local',
            tag: 'This device',
            blurb: 'Saved to this browser indefinitely. You delete them.',
            motif: '▣',
            accent: 'var(--mode-local)',
            persistence: 'kept until deleted',
            signin: false,
            ttl: false,
            enabled: true,
            order: 2,
        });

        this.register({
            id: MODE_NAMES.CLOUD,
            name: 'Cloud',
            altName: 'Persistent cloud',
            family: 'cloud',
            tag: 'Synced',
            blurb: 'Signed in. Synced across every device you use.',
            motif: '◇',
            accent: 'var(--mode-cloud)',
            persistence: 'synced · always',
            signin: true,
            ttl: false,
            enabled: true,
            order: 3,
        });

        this.register({
            id: MODE_NAMES.AI,
            name: 'AI',
            altName: 'AI-enabled',
            family: 'cloud',
            tag: 'Readable by models',
            blurb: 'Summarize pages, synthesize domains, and ask questions about what you have highlighted.',
            motif: '+',
            accent: 'var(--mode-ai)',
            persistence: 'synced · readable by AI',
            signin: true,
            ttl: false,
            enabled: true,
            order: 4,
        });
    }
}

export const modeRegistry = ModeRegistry.getInstance();
