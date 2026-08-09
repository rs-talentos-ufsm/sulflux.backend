import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';
import vitest from 'eslint-plugin-vitest';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'build',
      'generated',
      'coverage/',
      '.env*',
      'tsconfig*',
      'eslint*',
      'prettier*',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.eslint.json',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      vitest,
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,

      'no-unused-vars': 'off',

      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-var-requires': 'off',

      ...eslintConfigPrettier.rules,
      'prettier/prettier': 'error',

      // Tests
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
    },
  },
  {
    files: ['eslint.config.js', '*.js'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    files: [
      'src/app.js',
      'src/app.ts',
      'src/server.js',
      'src/server.ts',
      'vitest.*.ts',
      'prisma/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
