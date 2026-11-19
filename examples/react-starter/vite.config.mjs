import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the built app works from any folder (and inside the admin's frame).
  base: './',
  // The component library is one bundle of about 500 kB (130 kB gzipped).
  build: { chunkSizeWarningLimit: 600 },
});
