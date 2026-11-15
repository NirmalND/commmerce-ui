import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({
    // Svelte's a11y check can't see inside custom elements: cm-button renders a real <button>, so a click
    // handler on it is fine. Keep every other warning.
    onwarn(warning, handler) {
      const a11y = ['a11y_no_static_element_interactions', 'a11y_click_events_have_key_events'];
      if (a11y.includes(warning.code) && warning.frame?.includes('<cm-button')) return;
      handler(warning);
    },
  })],
  // Relative asset paths, so the built app works from any folder (and inside the admin's frame).
  base: './',
  // The component library is one bundle of about 500 kB (130 kB gzipped).
  build: { chunkSizeWarningLimit: 600 },
});
