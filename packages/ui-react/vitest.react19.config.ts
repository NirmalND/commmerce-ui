import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

// The same suite against React 19: `react` and `react-dom` resolve to react19/node_modules (installed by
// `npm run test:react19`), so the wrappers and the tests use React 19 while the default run keeps React 18.
const r19 = (p: string) => fileURLToPath(new URL(`./react19/node_modules/${p}`, import.meta.url));
export default mergeConfig(base, defineConfig({
  define: { __EXPECTED_REACT_MAJOR__: JSON.stringify('19') },
  resolve: {
    alias: [
      { find: /^react$/, replacement: r19('react/index.js') },
      { find: /^react\/(.*)$/, replacement: r19('react/$1') },
      { find: /^react-dom$/, replacement: r19('react-dom/index.js') },
      { find: /^react-dom\/(.*)$/, replacement: r19('react-dom/$1') },
    ],
  },
  // Pre-bundle separately from the React 18 run so the two never share a cached copy.
  cacheDir: 'node_modules/.vite-react19',
}));
