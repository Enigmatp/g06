import { defineConfig } from 'vite';

export default defineConfig({
  base: '/g05_discovery/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true,
  },
});
