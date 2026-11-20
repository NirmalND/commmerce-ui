import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Real Chromium with real iframes. Cross-origin tests load the app frame from 127.0.0.1 while the test page
// runs on localhost: same server, different origins. Set CHROMIUM_PATH to use an installed Chromium.
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  server: { cors: true, host: '127.0.0.1' }, // the frame's other origin is localhost, which also reaches 127.0.0.1
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
