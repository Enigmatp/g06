import { defineConfig } from 'vite';

export default defineConfig({
  base: '/g05_progress/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true,
  },
});
