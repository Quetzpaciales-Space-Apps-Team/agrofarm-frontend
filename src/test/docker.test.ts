// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');

describe('Docker configuration and runtime entrypoint (FE-003)', () => {
  it('defines a multi-stage Dockerfile with pinned nginx-unprivileged and HEALTHCHECK', () => {
    const dockerfile = fs.readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8');

    expect(dockerfile).toMatch(/^FROM\s+node:24\.\d+\.\d+-alpine\s+AS\s+build/m);
    expect(dockerfile).toMatch(/^FROM\s+nginxinc\/nginx-unprivileged:1\.\d+\.\d+-alpine/m);
    expect(dockerfile).toMatch(/HEALTHCHECK/);
  });

  it('configures nginx template with PORT, SPA fallback, /healthz and security headers', () => {
    const conf = fs.readFileSync(path.join(repoRoot, 'docker/default.conf.template'), 'utf8');

    expect(conf).toContain('listen ${PORT};');
    expect(conf).toContain('location = /healthz');
    expect(conf).toContain('try_files $uri $uri/ /index.html;');
    expect(conf).toContain('Content-Security-Policy');
    expect(conf).toContain('X-Frame-Options "DENY"');
    expect(conf).toContain('X-Content-Type-Options "nosniff"');
  });

  it('writes /config.json from API_BASE_URL and USE_MOCKS environment variables', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrofarm-config-'));
    const outputPath = path.join(tmpDir, 'config.json');
    const scriptPath = path.join(repoRoot, 'docker/40-generate-config.sh');

    execFileSync('sh', [scriptPath], {
      env: {
        ...process.env,
        API_BASE_URL: 'https://api.staging.agrofarm.example',
        USE_MOCKS: 'true',
        CONFIG_OUTPUT_PATH: outputPath,
      },
    });

    const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as {
      apiBaseUrl: string;
      useMocks: boolean;
    };
    expect(parsed).toEqual({
      apiBaseUrl: 'https://api.staging.agrofarm.example',
      useMocks: true,
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
