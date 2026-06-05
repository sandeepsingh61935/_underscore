/**
 * SocialAuthButton removal contract (Q8: V2 has no vendor brand colors).
 * Asserts the component is gone and AuthView no longer imports it.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PRIMITIVES_DIR = 'src/ui-system/components/primitives';

describe('V2 SocialAuthButton removal (Q8)', () => {
    it('SocialAuthButton.tsx is deleted', () => {
        expect(existsSync(join(PRIMITIVES_DIR, 'SocialAuthButton.tsx'))).toBe(false);
    });

    it('SocialAuthButton.stories.tsx is deleted', () => {
        expect(existsSync(join(PRIMITIVES_DIR, 'SocialAuthButton.stories.tsx'))).toBe(false);
    });

    it('AuthView no longer imports SocialAuthButton', () => {
        const authview = readFileSync('src/entrypoints/popup/views/AuthView.tsx', 'utf-8');
        expect(authview).not.toMatch(/import\s+.*SocialAuthButton/);
        expect(authview).not.toMatch(/<SocialAuthButton/);
    });
});
