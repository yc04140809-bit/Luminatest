import { defineConfig } from 'vitest/config';
import { mugenAliases } from '../shared-aliases.mjs';

/**
 * UNIT TESTS ONLY, and the include is why this file exists.
 *
 * `e2e/` holds Playwright specs. Without an explicit include, Vitest
 * finds them, tries to run them as its own, and reports six failing
 * files that are not failing at all. The two suites are run by two
 * different tools and must not see each other's work.
 */
export default defineConfig({
  resolve: { alias: mugenAliases() },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
