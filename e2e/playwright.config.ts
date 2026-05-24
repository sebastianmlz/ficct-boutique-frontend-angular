import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
});
