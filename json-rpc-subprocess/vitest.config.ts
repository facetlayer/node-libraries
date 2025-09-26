import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    timeout: 10000, // 10 second timeout for tests
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});