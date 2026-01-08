export interface ModeDefinition {
    id: string;
    name: string;
    description: string;
    requiresAuth: boolean;
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
            .filter(m => !m.requiresAuth || isAuthenticated)
            .sort((a, b) => a.order - b.order);
    }

    private registerDefaults() {
        this.register({
            id: 'focus',
            name: 'Focus',
            description: 'Ephemeral highlighting for focused reading',
            requiresAuth: false,
            enabled: true,
            order: 1,
        });

        this.register({
            id: 'capture',
            name: 'Capture',
            description: 'Temporary highlights cleared on navigation',
            requiresAuth: false,
            enabled: true,
            order: 2,
        });

        this.register({
            id: 'memory',
            name: 'Memory',
            description: 'Persistent vault storage',
            requiresAuth: true,
            enabled: true,
            order: 3,
        });

        this.register({
            id: 'neural',
            name: 'Neural',
            description: 'AI-powered research assistance',
            requiresAuth: true,
            enabled: false, // Disabled by default
            order: 4,
            badge: 'Coming Soon'
        });
    }
}

export const modeRegistry = ModeRegistry.getInstance();
