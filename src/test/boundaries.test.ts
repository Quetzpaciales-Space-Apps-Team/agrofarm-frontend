// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');

describe('Architecture layer boundaries (FE-002)', () => {
  const eslint = new ESLint({ cwd: repoRoot });

  it('rejects domain importing from infrastructure', async () => {
    const [result] = await eslint.lintText(
      "import { client } from '../infrastructure/api/client';\nexport const bad = client;\n",
      { filePath: path.join(repoRoot, 'src/domain/canary.ts') },
    );

    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('rejects domain importing from react', async () => {
    const [result] = await eslint.lintText(
      "import { useState } from 'react';\nexport const bad = useState;\n",
      { filePath: path.join(repoRoot, 'src/domain/canaryReact.ts') },
    );

    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('rejects presentation components importing from infrastructure directly', async () => {
    const [result] = await eslint.lintText(
      "import { client } from '../infrastructure/api/client';\nexport const bad = client;\n",
      { filePath: path.join(repoRoot, 'src/components/CanaryComponent.tsx') },
    );

    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('allows pure TypeScript inside domain', async () => {
    const [result] = await eslint.lintText(
      'export function toHectares(squareMeters: number): number {\n  return squareMeters / 10_000;\n}\n',
      { filePath: path.join(repoRoot, 'src/domain/units.ts') },
    );

    expect(result.errorCount).toBe(0);
  });
});
