import { defineConfig } from 'vitest/config';

// Real Chromium: React 18 + react-dom render the wrappers into the page. Set CHROMIUM_PATH to use an installed Chromium.
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  define: { __EXPECTED_REACT_MAJOR__: JSON.stringify('18') }, // vitest.react19.config.ts sets '19'
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true, provider: 'playwright', name: 'chromium', headless: true,
      ...(executablePath ? { providerOptions: { launch: { executablePath } } } : {}),
    },
  },
});
