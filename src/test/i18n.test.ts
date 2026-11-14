// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');

describe('i18n no-literal-string rule (FE-005)', () => {
  const eslint = new ESLint({ cwd: repoRoot });

  it('rejects hardcoded JSX string literals in components', async () => {
    const [result] = await eslint.lintText(
      'export function Canary() {\n  return <p>Hardcoded literal text</p>;\n}\n',
      { filePath: path.join(repoRoot, 'src/components/CanaryText.tsx') },
    );

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((m) => m.ruleId === 'i18next/no-literal-string')).toBe(true);
  });

  it('allows translated JSX strings using useTranslation', async () => {
    const [result] = await eslint.lintText(
      "import { useTranslation } from 'react-i18next';\nexport function Canary() {\n  const { t } = useTranslation();\n  return <p>{t('app.shell.tagline')}</p>;\n}\n",
      { filePath: path.join(repoRoot, 'src/components/CanaryTranslated.tsx') },
    );

    expect(result.errorCount).toBe(0);
  });
});
