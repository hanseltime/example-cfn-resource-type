module.exports = {
  root: true,
  plugins: ['deprecation', 'prettier'],
  extends: ['eslint:recommended'],
  env: {
    node: true,
    es2018: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  ignorePatterns: ['/**/dist/**/*', '/**/cdk.out/**/*'],
  rules: {
    // NOTE: if you're failing this check, you can run 'yarn lint --fix' and prettier rules will be applied
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      env: { es6: true, node: true },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      globals: { Atomics: 'readonly', SharedArrayBuffer: 'readonly' },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: 'tsconfig.json',
      },
      plugins: ['@typescript-eslint'],
      rules: {
        // Note: you must disable the base rule as it can report incorrect errors
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',
        'deprecation/deprecation': 'warn',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
}
