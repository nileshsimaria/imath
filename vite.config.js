import { defineConfig } from 'vite';

// Build ID baked into the bundle. Appended as ?v=… to every JSON fetch so
// each deploy invalidates the browser's HTTP cache for content files.
const BUILD_ID = String(Date.now());

export default defineConfig({
  base: process.env.VITE_BASE ?? '/imath/',
  server: { port: 5173, open: true },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
});
