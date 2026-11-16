// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');

describe('GitHub Actions CD workflow (FE-007)', () => {
  it('deploys develop to staging and main to production via WIF secrets without hardcoded accounts', () => {
    const cdYml = fs.readFileSync(path.join(repoRoot, '.github/workflows/cd.yml'), 'utf8');

    expect(cdYml).toContain('- develop');
    expect(cdYml).toContain('- main');
    expect(cdYml).toContain('workflow_dispatch:');

    // Workload Identity Federation via encrypted secrets, no hardcoded service account or project ID
    expect(cdYml).toContain('google-github-actions/auth@v2');
    expect(cdYml).toContain('secrets.GCP_WIF_PROVIDER');
    expect(cdYml).toContain('secrets.GCP_SA_CI_DEPLOYER');
    expect(cdYml).toContain('secrets.GCP_PROJECT_ID');
    expect(cdYml).not.toContain('credentials_json');
    expect(cdYml).not.toContain('.iam.gserviceaccount.com');
    expect(cdYml).not.toContain('agrofarm-spaceapps');

    // Staging and manual-approval production environments + smoke test
    expect(cdYml).toContain('environment: staging');
    expect(cdYml).toContain('environment: production');
    expect(cdYml).toContain('frontend-staging');
    expect(cdYml).toContain('frontend-prod');
    // Cloud Run answers 404 for /healthz from outside, so the smoke test loads the app shell.
    expect(cdYml).not.toContain('"$SERVICE_URL/healthz"');
    expect(
      cdYml.match(/curl -fsS[^\n]*"\$SERVICE_URL\/" \| grep -qi "<!doctype html"/g),
    ).toHaveLength(2);
    expect(cdYml).toContain('::add-mask::');
  });

  it('documents rollback steps in deploy/rollback.md', () => {
    const rollbackDoc = fs.readFileSync(path.join(repoRoot, 'deploy/rollback.md'), 'utf8');
    expect(rollbackDoc).toContain('gcloud run services update-traffic');
    expect(rollbackDoc).toContain('--to-revisions');
    expect(rollbackDoc).toContain('frontend-staging');
  });
});
