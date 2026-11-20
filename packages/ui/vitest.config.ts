import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Real Chromium: form-associated custom elements (ElementInternals) aren't implemented in jsdom/happy-dom.
// Set CHROMIUM_PATH to use an already-installed Chromium instead of `npx playwright install chromium`.
const executablePath = process.env.CHROMIUM_PATH;
const browser = (process.env.VITEST_BROWSER ?? 'chromium') as 'chromium' | 'firefox' | 'webkit';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Firefox runs test files one at a time (issue #2). Parallel files share one Firefox window, so one file's focus
    // and pointer moves land in another's frame: focus-return and hover tests failed only in the full run.
    // Chromium and WebKit keep running files in parallel.
    fileParallelism: browser !== 'firefox',
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
      instances: [{ browser }],
    },
  },
});
