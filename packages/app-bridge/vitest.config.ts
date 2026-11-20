import { defineConfig } from 'vitest/config';

// Real Chromium with real iframes. Cross-origin tests load the app frame from 127.0.0.1 while the test page
// runs on localhost: same server, different origins. Set CHROMIUM_PATH to use an installed Chromium.
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  server: { cors: true, host: '127.0.0.1' }, // the frame's other origin is localhost, which also reaches 127.0.0.1
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true, provider: 'playwright', name: 'chromium', headless: true,
      ...(executablePath ? { providerOptions: { launch: { executablePath } } } : {}),
    },
  },
});
