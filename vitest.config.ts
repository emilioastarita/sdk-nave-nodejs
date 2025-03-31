import { configDotenv } from 'dotenv';
import { defineConfig } from 'vitest/config';

configDotenv({
  path: './.env',
});

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    testTimeout: 60 * 60 * 1000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist'],
    },
  },
});
