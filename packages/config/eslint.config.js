// @ts-check
const js = require('@eslint/js')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      // Enforce no `any` — Rule 4 from CONTRIBUTING.md
      '@typescript-eslint/no-explicit-any': 'error',
      // Allow unused vars prefixed with _ (standard TS pattern)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Enforce consistent imports
      'no-restricted-imports': [
        'error',
        {
          // Rule 2: No direct LLM SDK imports outside @wren/llm
          patterns: [
            {
              group: ['openai', '@anthropic-ai/*', '@mistralai/*', 'cohere-ai'],
              message:
                'Direct LLM SDK imports are forbidden. Use @wren/llm instead. See CONTRIBUTING.md Rule 2.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/generated/**'],
  },
]

module.exports = config
