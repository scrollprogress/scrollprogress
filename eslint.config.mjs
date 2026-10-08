import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores([
        '**/node_modules/**',
        'dist/**',
        'dist-ssr/**',
        'playground/dist/**',
        'test-results/**',
        'coverage/**',
        '_reference/**'
    ]),
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        extends: [js.configs.recommended],
        rules: {
            'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
            'no-unused-vars': [
                'error',
                { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }
            ]
        }
    },
    {
        files: ['**/*.{ts,mts,cts}'],
        extends: [tseslint.configs.recommended],
        rules: {
            // Match tsc: callback parameter names and unused catch bindings are allowed.
            '@typescript-eslint/no-unused-vars': [
                'error',
                { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }
            ]
        }
    },
    {
        files: [
            'src/**/*.{js,ts}',
            'tests/entries/**/*.ts',
            'tests/browser/**/*.js',
            'playground/**/*.ts'
        ],
        languageOptions: { globals: globals.browser }
    },
    {
        files: ['scripts/**/*.{js,mjs,ts}', 'tests/tooling/**/*.{js,mjs,ts}', '*.{js,mjs,cjs,ts}'],
        languageOptions: { globals: globals.node }
    },
    // Formatting belongs to Prettier; do not run it through ESLint.
    prettier
]);
