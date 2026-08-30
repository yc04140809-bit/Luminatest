import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
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
