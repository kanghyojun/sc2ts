import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/__tests__/**/*.ts', 'src/cli/**/*.ts'],
    plugins: { import: importPlugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: './tsconfig.json' },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-const': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',

      // Import ordering
      'import/order': ['error', {
        'groups': [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
        'newlines-between': 'always',
        'alphabetize': { 'order': 'asc', 'caseInsensitive': true },
      }],
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',

      // General rules
      'no-console': 'warn', 'no-debugger': 'error', 'no-duplicate-imports': 'error',
      'prefer-const': 'error', 'no-var': 'error',

      // Style
      'quotes': ['error', 'single'], 'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'], 'indent': ['error', 2],
      'object-curly-spacing': ['error', 'always'], 'array-bracket-spacing': ['error', 'never'],
    },
  },
  {
    files: ['test/**/*.ts', '**/*.test.ts', '**/*.spec.ts', 'jest.config.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', 'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'warn', '@typescript-eslint/no-inferrable-types': 'off',
    },
  },
  {
    files: ['src/cli/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: { 'no-console': 'off', '@typescript-eslint/no-explicit-any': 'warn' },
  },
  {
    ignores: [
      'dist/**', 'node_modules/**', 'bin/*.js', 'scripts/*.js', '*.js', '*.mjs',
      'coverage/**', 'jest.config.ts', '.debug/**', '.reference/**',
    ],
  },
);
