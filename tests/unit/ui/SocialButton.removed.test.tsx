/**
 * SocialButton removal contract (Q8: V2 has no vendor brand colors).
 * Asserts the component is gone and no consumer imports it.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PRIMITIVES_DIR = 'src/ui-system/components/primitives';

describe('V2 SocialButton removal (Q8)', () => {
  it('SocialButton.tsx is deleted', () => {
    expect(existsSync(join(PRIMITIVES_DIR, 'SocialButton.tsx'))).toBe(false);
  });

  it('SocialButton.stories.tsx is deleted', () => {
    expect(existsSync(join(PRIMITIVES_DIR, 'SocialButton.stories.tsx'))).toBe(false);
  });

  it('SignInView no longer imports SocialButton', () => {
    const signin = readFileSync('src/features/auth/SignInView.tsx', 'utf-8');
    expect(signin).not.toMatch(/import\s+.*SocialButton/);
    expect(signin).not.toMatch(/<SocialButton/);
  });
});
