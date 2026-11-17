import { defineConfig, devices } from '@playwright/test';

// `npm test` builds the app, serves dist/ with `vite preview` and runs tests/ in Chromium.
export default defineConfig({
  testDir: 'tests',
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
