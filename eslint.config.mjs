import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import jsonc from 'eslint-plugin-jsonc';
import globals from 'globals';

const styleRules = {
  indent: ['error', 2],
  'linebreak-style': ['error', 'unix'],
  'space-before-function-paren': ['error', 'always'],
  curly: ['error', 'all'],
  'brace-style': ['error', '1tbs'],
  quotes: ['warn', 'single', { avoidEscape: true }],
  semi: ['error', 'always'],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'space-before-blocks': ['error', 'always'],
  'keyword-spacing': ['error', { before: true, after: true }],
  'no-trailing-spaces': 'error',
  'eol-last': ['error', 'always'],
  'max-params': ['error', 4]
};

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**']
  },
  {
    files: ['**/*.{js,mjs,ts,mts}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    rules: styleRules
  },
  {
    files: ['**/*.{ts,mts}'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['e2e/**/*.ts'],
    extends: [playwright.configs['flat/recommended']]
  },
  {
    files: ['**/*.{json,jsonc,json5}'],
    extends: [jsonc.configs['flat/recommended-with-json']],
    rules: {
      'jsonc/indent': ['error', 2],
      'jsonc/object-curly-spacing': ['error', 'always'],
      'jsonc/array-bracket-spacing': ['error', 'never']
    }
  }
);
