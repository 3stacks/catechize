// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // data/ is written by scripts/mobile-data.ts. The tests run with the root package.
    ignores: ['dist/*', 'data/*', '**/*.test.ts'],
  },
]);
