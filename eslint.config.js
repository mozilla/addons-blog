const { defineConfig } = require('eslint/config');
const amoBase = require('eslint-config-amo/base');

module.exports = defineConfig([
  {
    ignores: ['build/', 'dist/', 'tests/fixtures/'],
  },
  amoBase,
  {
    languageOptions: {
      ecmaVersion: 2022,
    },
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
    },
  },
]);
