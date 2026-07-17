import { defineConfig } from '@playwright/test';

// Demo-recording config only — not part of the app's test suite (that's
// vitest, per CLAUDE.md's zero-dep/tooling conventions). Output is
// gitignored (apps/web/demo-recordings/); nothing here is meant to be
// checked in or run in CI.
export default defineConfig({
  testDir: './demo',
  outputDir: './demo-recordings',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.DEMO_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 },
    },
  },
});
