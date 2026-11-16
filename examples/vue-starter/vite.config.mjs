import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue({
    // Tell Vue that cm-* tags are custom elements, not Vue components it failed to find.
    template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('cm-') } },
  })],
  // Relative asset paths, so the built app works from any folder (and inside the admin's frame).
  base: './',
  // The component library is one bundle of about 500 kB (130 kB gzipped).
  build: { chunkSizeWarningLimit: 600 },
});
