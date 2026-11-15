import { defineConfig } from 'vitest/config';

// Real Chromium: form-associated custom elements (ElementInternals) aren't implemented in jsdom/happy-dom.
// Set CHROMIUM_PATH to use an already-installed Chromium instead of `npx playwright install chromium`.
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true, provider: 'playwright', name: 'chromium', headless: true,
      ...(executablePath ? { providerOptions: { launch: { executablePath } } } : {}),
    },
  },
});
