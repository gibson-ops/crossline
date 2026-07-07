import { defineConfig } from 'vitest/config';

// Integration tests run against REAL services (InstantDB, the engine app).
// Run with secrets injected:  infisical-agent run --env=dev -- npm test
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
