import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Real Chromium: React 18 + react-dom render the wrappers into the page. Set CHROMIUM_PATH to use an installed Chromium.
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  define: { __EXPECTED_REACT_MAJOR__: JSON.stringify('18') }, // vitest.react19.config.ts sets '19'
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true, headless: true,
      // Firefox: focusmanager.testmode keeps focus and focus events working as if the window always had focus. Under
      // vitest 4 the test frame in Firefox could lose window focus, so .focus(), key presses and focusin went astray.
      provider: playwright({
        launchOptions: {
          ...(executablePath ? { executablePath } : {}),
          firefoxUserPrefs: { 'focusmanager.testmode': true },
        },
      }),
      // VITEST_BROWSER picks the engine (chromium, firefox or webkit); scripts/test-shard.mjs sets it in CI.
      instances: [{ browser: (process.env.VITEST_BROWSER ?? 'chromium') as 'chromium' | 'firefox' | 'webkit' }],
    },
  },
});
