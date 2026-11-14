import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import i18next from 'eslint-plugin-i18next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'src/infrastructure/api/schema.d.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      boundaries,
      i18next,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        {
          type: 'test',
          pattern: ['src/test/**', 'src/**/__tests__/**', 'src/**/*.{test,spec}.{ts,tsx}'],
        },
        {
          type: 'app',
          pattern: ['src/app/**'],
        },
        {
          type: 'presentation',
          pattern: ['src/pages/**', 'src/components/**', 'src/features/*/components/**'],
        },
        {
          type: 'application',
          pattern: ['src/services/**', 'src/features/*/hooks/**', 'src/features/*/state/**'],
        },
        {
          type: 'domain',
          pattern: ['src/domain/**'],
        },
        {
          type: 'infrastructure',
          pattern: ['src/infrastructure/**'],
        },
        {
          type: 'i18n',
          pattern: ['src/i18n/**'],
        },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'test' } },
              allow: {
                to: {
                  element: {
                    types: [
                      'app',
                      'presentation',
                      'application',
                      'domain',
                      'infrastructure',
                      'i18n',
                      'test',
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: [
                      'app',
                      'presentation',
                      'application',
                      'domain',
                      'infrastructure',
                      'i18n',
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: {
                to: {
                  element: {
                    types: ['presentation', 'application', 'domain', 'i18n'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'application' } },
              allow: {
                to: {
                  element: {
                    types: ['application', 'domain', 'infrastructure', 'i18n'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'domain' } },
              allow: {
                to: {
                  element: {
                    type: 'domain',
                  },
                },
              },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: {
                  element: {
                    types: ['infrastructure', 'domain'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'i18n' } },
              allow: {
                to: {
                  element: {
                    type: 'i18n',
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/__tests__/**', 'src/**/*.{test,spec}.tsx'],
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-dom'],
          patterns: [
            {
              group: [
                '**/infrastructure/**',
                '**/app/**',
                '**/pages/**',
                '**/components/**',
                '**/features/**',
                '**/services/**',
              ],
              message: 'Domain layer must remain pure TypeScript and may only import from domain.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/pages/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/features/*/components/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message:
                'Presentation layer may not import from infrastructure directly; use application hooks or services.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
