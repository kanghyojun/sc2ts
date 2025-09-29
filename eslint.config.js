const js = require('@eslint/js');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/__tests__/**/*.ts', 'src/cli/**/*.ts'],
    plugins: { import: importPlugin },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // General rules
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Import ordering
      'import/order': ['error', {
        'groups': [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
        'newlines-between': 'always',
        'alphabetize': { 'order': 'asc', 'caseInsensitive': true },
      }],
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',

      // Style
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'indent': ['error', 2],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
    },
  },
  {
    files: ['test/**/*.ts', '**/*.test.ts', '**/*.spec.ts', 'jest.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['src/cli/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'bin/*.js',
      'scripts/*.js',
      '*.js',
      '*.mjs',
      'coverage/**',
      'jest.config.ts',
      '.debug/**',
      '.reference/**',
    ],
  },
];