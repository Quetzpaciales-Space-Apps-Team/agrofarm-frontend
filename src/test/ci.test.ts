// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');

describe('GitHub Actions CI workflow (FE-004)', () => {
  it('defines all required jobs and wires them into ci-gate needs', () => {
    const ciYml = fs.readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');

    for (const jobName of [
      'policy:',
      'lint:',
      'typecheck:',
      'test:',
      'build:',
      'docker-build:',
      'trivy:',
      'ci-gate:',
    ]) {
      expect(ciYml).toContain(`  ${jobName}`);
    }

    expect(ciYml).toContain('--coverage');
    expect(ciYml).toContain('256000');
    expect(ciYml).toContain(
      'needs: [policy, lint, typecheck, test, build, docker-build, trivy]',
    );
  });
});
