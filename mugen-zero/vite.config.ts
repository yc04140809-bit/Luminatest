import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

import { execSync } from 'node:child_process';

/**
 * Build identity, so a QA REPORT can say which build it describes. Read
 * once at config time; a checkout without git simply reports 'unknown'
 * rather than failing the build.
 */
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

const buildDefine = {
  __BUILD_COMMIT__: JSON.stringify(gitCommit()),
  __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
};

export default defineConfig({
  base: './',
  define: buildDefine,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React is needed for the very first paint; Phaser is not — it
          // is dynamically imported with the forest screen and lands in
          // its own chunk, keeping the initial download small.
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
