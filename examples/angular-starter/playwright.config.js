import { defineConfig, devices } from '@playwright/test';

// `npm test` builds the app, serves dist/browser with serve.mjs and runs tests/ in Chromium.
export default defineConfig({
  testDir: 'tests',
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node serve.mjs 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
