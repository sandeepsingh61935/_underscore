import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');

const auditedFiles = [
  'src/features/modes/ModeCard.tsx',
  'src/ui-system/components/composed/ModeCard.tsx',
  'src/ui-system/components/primitives/SocialButton.tsx',
  'src/features/collections/views/CollectionsView.tsx',
  'src/ui-system/pages/CollectionsView.tsx',
  'src/features/collections/views/DomainDetailsView.tsx',
  'src/ui-system/pages/DomainDetailsView.tsx',
];

const storyFiles = [
  'src/ui-system/components/composed/ModeCard.stories.tsx',
  'src/ui-system/components/primitives/SocialButton.stories.tsx',
  'src/ui-system/pages/CollectionsView.stories.tsx',
  'src/ui-system/pages/DomainDetailsView.stories.tsx',
];

const bannedHoverHandlers = /\bonMouseEnter\b|\bonMouseLeave\b/;
const bannedVisualMutation =
  /currentTarget\.style\.(boxShadow|transform|borderColor)|style\.(boxShadow|transform|borderColor)\s*=|boxShadow\s*=|transform\s*=|borderColor\s*=/;

async function collectTsxFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectTsxFiles(fullPath);
      }

      return fullPath.endsWith('.tsx') ? [fullPath] : [];
    })
  );

  return nestedFiles.flat().sort();
}

describe('Issue #18 hover-state regression', () => {
  it('keeps onMouseEnter and onMouseLeave out of src TSX files', async () => {
    const files = await collectTsxFiles(srcRoot);
    const matches: string[] = [];

    for (const file of files) {
      const source = await fs.readFile(file, 'utf8');
      const match = source.match(bannedHoverHandlers);

      if (match) {
        matches.push(`${path.relative(repoRoot, file)}: ${match[0]}`);
      }
    }

    expect(matches).toEqual([]);
  });

  it('keeps the audited files free of DOM style mutation for hover visuals', async () => {
    const matches: string[] = [];

    for (const relativeFile of auditedFiles) {
      const absoluteFile = path.join(repoRoot, relativeFile);
      const source = await fs.readFile(absoluteFile, 'utf8');
      const match = source.match(bannedVisualMutation);

      if (match) {
        matches.push(`${relativeFile}: ${match[0]}`);
      }
    }

    expect(matches).toEqual([]);
  });

  it('retains Storybook coverage for the audited UI-system surfaces', async () => {
    await expect(
      Promise.all(
        storyFiles.map(async (relativeFile) => {
          const absoluteFile = path.join(repoRoot, relativeFile);
          const source = await fs.readFile(absoluteFile, 'utf8');

          expect(source).toContain('export default');
        })
      )
    ).resolves.toHaveLength(storyFiles.length);
  });
});
