/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import solid from '@solidjs/vite-plugin';

export default defineConfig({
  // Relative asset URLs so the build works from any path (e.g. GitHub Pages).
  base: './',
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
